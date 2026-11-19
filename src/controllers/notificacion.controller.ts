import { Response } from "express";
import { CustomRequest } from "../middlewares/validar-jwt";
import {
  NotificacionError,
  contarNoLeidas,
  eliminar,
  listar,
  marcarLeida,
  marcarTodasLeidas,
} from "../services/notificaciones/notificacion.service";

const responderError = (res: Response, error: unknown, contexto: string) => {
  if (error instanceof NotificacionError) {
    return res.status(error.statusCode).json({
      ok: false,
      code: error.code,
      msg: error.message,
    });
  }
  console.error(`[NOTIFICACIONES] ${contexto}:`, error);
  return res.status(500).json({
    ok: false,
    code: "ERROR_INTERNO",
    msg: "No fue posible completar la operación con las notificaciones.",
  });
};

/** El usuario siempre sale del JWT; las sesiones QR no tienen notificaciones. */
const obtenerUsuarioId = (req: CustomRequest): number => {
  if (req.sessionType === "QR" || !req.id) {
    throw new NotificacionError("SESION_NO_PERMITIDA", "Esta sesión no tiene notificaciones.", 403);
  }
  return Number(req.id);
};

const leerId = (valor: unknown): number => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new NotificacionError("ID_INVALIDO", "El identificador no es válido.", 400);
  }
  return id;
};

const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);

/** GET /api/notificaciones?estado=todas|leidas|no-leidas&categoria=&pagina=&porPagina= */
export const listarNotificaciones = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const estado = texto(req.query.estado);
    if (estado && !["todas", "leidas", "no-leidas"].includes(estado)) {
      throw new NotificacionError("ESTADO_INVALIDO", "El estado indicado no es válido.", 400);
    }
    const resultado = await listar(usuarioId, {
      estado: estado as "todas" | "leidas" | "no-leidas" | undefined,
      categoria: texto(req.query.categoria),
      pagina: Number(req.query.pagina),
      porPagina: Number(req.query.porPagina),
    });
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    return responderError(res, error, "listar");
  }
};

/** GET /api/notificaciones/no-leidas — contador liviano que consulta la campana. */
export const contarNotificacionesNoLeidas = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    return res.json({ ok: true, noLeidas: await contarNoLeidas(usuarioId) });
  } catch (error) {
    return responderError(res, error, "contar");
  }
};

/** PATCH /api/notificaciones/:id/leida */
export const marcarNotificacionLeida = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    await marcarLeida(usuarioId, leerId(req.params.id));
    return res.json({ ok: true, noLeidas: await contarNoLeidas(usuarioId) });
  } catch (error) {
    return responderError(res, error, "marcar-leida");
  }
};

/** PATCH /api/notificaciones/leidas — marca todas (opcionalmente solo una categoría). */
export const marcarNotificacionesLeidas = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const marcadas = await marcarTodasLeidas(usuarioId, texto(req.query.categoria));
    return res.json({ ok: true, marcadas, noLeidas: await contarNoLeidas(usuarioId) });
  } catch (error) {
    return responderError(res, error, "marcar-todas");
  }
};

/** DELETE /api/notificaciones/:id */
export const eliminarNotificacion = async (req: CustomRequest, res: Response) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    await eliminar(usuarioId, leerId(req.params.id));
    return res.json({ ok: true, noLeidas: await contarNoLeidas(usuarioId) });
  } catch (error) {
    return responderError(res, error, "eliminar");
  }
};
