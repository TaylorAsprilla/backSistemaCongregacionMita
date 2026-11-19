import { Response } from "express";
import { Op, QueryTypes } from "sequelize";
import db from "../database/connection";
import Usuario from "../models/usuario.model";
import { CustomRequest } from "../middlewares/validar-jwt";
import {
  FotoPerfilError,
  esClaveFotoDeUsuario,
  generarClaveFotoPerfil,
  procesarFotoPerfil,
} from "../helpers/fotoPerfil";
import { getFotoPerfilStorage, ttlUrlFoto } from "../services/fotoPerfilStorage";

const MAX_IDS_POR_CONSULTA = 100;

const responderError = (res: Response, error: unknown, contexto: string) => {
  if (error instanceof FotoPerfilError) {
    return res.status(error.statusCode).json({
      ok: false,
      success: false,
      code: error.code,
      message: error.message,
    });
  }
  console.error(`[FOTO_PERFIL] ${contexto}:`, error);
  return res.status(500).json({
    ok: false,
    success: false,
    code: "ALMACENAMIENTO_ERROR",
    message: "No se pudo completar la operación con la fotografía.",
  });
};

/** El usuario siempre sale del JWT; las sesiones QR no tienen perfil propio. */
const obtenerUsuarioId = (req: CustomRequest): number => {
  if (req.sessionType === "QR" || !req.id) {
    throw new FotoPerfilError(
      "SESION_NO_PERMITIDA",
      "Esta sesión no puede administrar fotografías de perfil.",
      403,
    );
  }
  return Number(req.id);
};

const cargarUsuario = async (id: number) => {
  const usuario = await Usuario.findByPk(id, { attributes: ["id", "foto"] });
  if (!usuario) {
    throw new FotoPerfilError("USUARIO_NO_ENCONTRADO", "Usuario no encontrado.", 404);
  }
  return usuario;
};

const eliminarSilencioso = async (clave: string, motivo: string) => {
  try {
    await getFotoPerfilStorage().eliminar(clave);
  } catch (error) {
    // No debe revertir una operación ya confirmada; queda registrado para limpieza.
    console.error(`[FOTO_PERFIL] Objeto huérfano (${motivo}): ${clave}`, error);
  }
};

/**
 * Indicador "ya vio el tour de la fotografía" (columna usuario.fotoTourVisto, migración 016).
 * Se usa SQL directo y no el modelo: así, si la migración aún no se aplicó, solo esta función
 * degrada (devuelve null y el cliente usa su respaldo local) y ninguna otra consulta de Usuario se rompe.
 */
const leerTourVisto = async (usuarioId: number): Promise<boolean | null> => {
  try {
    const filas = (await db.query("SELECT fotoTourVisto FROM usuario WHERE id = :id", {
      type: QueryTypes.SELECT,
      replacements: { id: usuarioId },
    })) as Array<{ fotoTourVisto: number | boolean | null }>;
    return filas.length ? Number(filas[0].fotoTourVisto) === 1 : null;
  } catch (error) {
    console.warn("[FOTO_PERFIL] No se pudo leer fotoTourVisto (¿migración 016 pendiente?):", error);
    return null;
  }
};

const construirRespuestaFoto = async (usuarioId: number, clave: unknown) => {
  if (!esClaveFotoDeUsuario(clave, usuarioId)) {
    return { foto: null, url: null, expiraEn: null };
  }
  const ttl = ttlUrlFoto();
  const url = await getFotoPerfilStorage().urlFirmada(clave, ttl);
  return { foto: clave, url, expiraEn: ttl };
};

/** POST /api/foto-perfil — cuerpo binario (image/jpeg | image/png | image/webp). */
export const subirFotoPerfil = async (req: CustomRequest, res: Response) => {
  let claveNueva: string | undefined;
  try {
    const usuarioId = obtenerUsuarioId(req);
    const imagen = await procesarFotoPerfil(req.body);
    const usuario = await cargarUsuario(usuarioId);
    const claveAnterior = usuario.getDataValue("foto");

    claveNueva = generarClaveFotoPerfil(usuarioId);
    try {
      await getFotoPerfilStorage().guardar(claveNueva, imagen, "image/webp");
    } catch (error) {
      if (error instanceof FotoPerfilError) throw error;
      console.error("[FOTO_PERFIL] Error al guardar en S3:", error);
      claveNueva = undefined;
      throw new FotoPerfilError(
        "ALMACENAMIENTO_ERROR",
        "No se pudo guardar la fotografía. Intente nuevamente.",
        502,
      );
    }

    try {
      await usuario.update({ foto: claveNueva });
      // MySQL puede truncar en silencio si la columna `foto` es más corta que la clave:
      // se relee la fila y se exige que la referencia haya quedado completa.
      await usuario.reload({ attributes: ["id", "foto"] });
      if (usuario.getDataValue("foto") !== claveNueva) {
        throw new FotoPerfilError(
          "ALMACENAMIENTO_ERROR",
          "No se pudo guardar la referencia de la fotografía. Contacte al administrador.",
          500,
        );
      }
    } catch (error) {
      // No dejar el objeto nuevo huérfano; la fotografía anterior se conserva.
      await eliminarSilencioso(claveNueva, "falló la actualización en MySQL");
      claveNueva = undefined;
      throw error;
    }

    // Solo ahora, con la referencia ya confirmada, se retira la imagen anterior.
    if (esClaveFotoDeUsuario(claveAnterior, usuarioId) && claveAnterior !== claveNueva) {
      await eliminarSilencioso(claveAnterior, "reemplazo");
    }

    return res.status(201).json({
      ok: true,
      message: "Fotografía actualizada correctamente.",
      ...(await construirRespuestaFoto(usuarioId, claveNueva)),
    });
  } catch (error) {
    return responderError(res, error, "subir");
  }
};

/** DELETE /api/foto-perfil */
export const eliminarFotoPerfil = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const usuario = await cargarUsuario(usuarioId);
    const claveActual = usuario.getDataValue("foto");

    if (claveActual) {
      await usuario.update({ foto: null });
    }
    if (esClaveFotoDeUsuario(claveActual, usuarioId)) {
      await eliminarSilencioso(claveActual, "eliminación");
    }

    return res.json({ ok: true, message: "Fotografía eliminada correctamente.", foto: null });
  } catch (error) {
    return responderError(res, error, "eliminar");
  }
};

/** GET /api/foto-perfil — foto y URL firmada del usuario autenticado. */
export const obtenerFotoPerfil = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const usuario = await cargarUsuario(usuarioId);
    return res.json({
      ok: true,
      ...(await construirRespuestaFoto(usuarioId, usuario.getDataValue("foto"))),
      tourVisto: await leerTourVisto(usuarioId),
    });
  } catch (error) {
    return responderError(res, error, "obtener");
  }
};

/** POST /api/foto-perfil/tour-visto — registra que el usuario autenticado ya vio el tour (idempotente). */
export const marcarTourFotoVisto = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    try {
      await db.query("UPDATE usuario SET fotoTourVisto = 1 WHERE id = :id", { replacements: { id: usuarioId } });
    } catch (error) {
      console.warn("[FOTO_PERFIL] No se pudo guardar fotoTourVisto (¿migración 016 pendiente?):", error);
      return res.json({ ok: true, guardado: false });
    }
    return res.json({ ok: true, guardado: true });
  } catch (error) {
    return responderError(res, error, "tour-visto");
  }
};

/**
 * POST /api/foto-perfil/urls  { ids: number[] }
 * Resuelve en lote las URLs firmadas para mostrar avatares en listados.
 * Cualquier usuario autenticado puede ver las fotos (son parte de la identidad
 * visible en la plataforma); solo el propietario puede modificarlas.
 */
export const obtenerUrlsFotos = async (req: CustomRequest, res: Response) => {
  try {
    const bruto = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids: number[] = Array.from(
      new Set<number>(bruto.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)),
    ).slice(0, MAX_IDS_POR_CONSULTA);

    if (ids.length === 0) {
      return res.json({ ok: true, fotos: {} });
    }

    const usuarios = await Usuario.findAll({
      attributes: ["id", "foto"],
      where: { id: { [Op.in]: ids }, foto: { [Op.ne]: null } },
    });

    const ttl = ttlUrlFoto();
    const storage = getFotoPerfilStorage();
    const fotos: Record<number, { foto: string; url: string }> = {};
    await Promise.all(
      usuarios.map(async (usuario) => {
        const id = Number(usuario.getDataValue("id"));
        const clave = usuario.getDataValue("foto");
        if (!esClaveFotoDeUsuario(clave, id)) return;
        fotos[id] = { foto: clave, url: await storage.urlFirmada(clave, ttl) };
      }),
    );

    return res.json({ ok: true, expiraEn: ttl, fotos });
  } catch (error) {
    return responderError(res, error, "urls");
  }
};
