import { Request, Response } from "express";
import QrCodigos from "../models/qrCodigos.model";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import DeviceDetector from "device-detector-js";
import generarJWT from "../helpers/tokenJwt";
import QrAccesos from "../models/qrAccesos";
import UbicacionConexion from "../models/ubicacionConexion.model";
import Congregacion from "../models/congregacion.model";
import config from "../config/config";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { guardarInformacionConexion } from "../helpers/guardarInformacionConexion";
import { createQrSession } from "../helpers/session.service";
import { literal, Op, Transaction, WhereOptions } from "sequelize";
import db from "../database/connection";
import Usuario from "../models/usuario.model";
import DesafioAccesoQr from "../models/desafioAccesoQr.model";
import enviarEmail from "../helpers/email";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";
import {
  generarCodigoQr, resumirCodigoQr, verificarCodigoQr, validarDatosQr,
  HORAS_SESION_QR, MINUTOS_CODIGO_QR, MAX_INTENTOS_CODIGO_QR, PUESTOS_QR,
} from "../helpers/accesoQr";

const environment = config[process.env.NODE_ENV || "development"];

async function generarImagenQr(qrUrl: string): Promise<string> {
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width: 800,
    margin: 2,
    color: { dark: "#1976d2", light: "#ffffff" },
  });
  const logo = await sharp(path.join(__dirname, "..", "assets", "imagenes", "logo.png"))
    .resize(100, 100).toBuffer();
  const imagen = await sharp(qrBuffer)
    .composite([{ input: logo, gravity: "center" }])
    .png().toBuffer();
  return imagen.toString("base64");
}

export const getUltimoQrGenerado = async (req: Request, res: Response) => {
  try {
    // Buscar el último QR generado basado en la columna `creado_en`
    const ultimoQr = await QrCodigos.findOne({
      order: [["createdAt", "DESC"]], // Ordenar por la fecha de creación en orden descendente
    });

    // Verificar si existe un QR generado
    if (!ultimoQr) {
      return res.status(404).json({
        ok: false,
        msg: "No se encontró ningún código QR generado.",
      });
    }

    // Generar la URL del QR
    const baseUrl =
      environment.loginPorQr || "https://cmar.live/sistemacmi/#/login?ticket=";
    const qrUrl = `${baseUrl}${ultimoQr.getDataValue("qrCode")}`;

    const qrImageBase64Encoded = await generarImagenQr(qrUrl);

    res.json({
      ok: true,
      qr: ultimoQr,
      qrImage: qrImageBase64Encoded, // Imagen del QR en formato base64
    });
  } catch (error) {
    console.error("Error al obtener el último QR generado:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno, contacte al administrador.",
    });
  }
};
export const generarQrCode = async (req: Request, res: Response) => {
  const { idCongregacion, descripcion } = req.body;

  // Validar que idCongregacion sea un número válido
  if (!idCongregacion || typeof idCongregacion !== "number") {
    return res.status(400).json({ ok: false, msg: "idCongregacion inválido" });
  }

  // Generar el código QR único
  const year = new Date().getFullYear();
  const randomId = uuidv4().replace(/-/g, "").toUpperCase();
  const qrCode = `${process.env.PREFIJO_QR || "QR"}-${year}-${randomId}`;
  const baseUrl =
    environment.loginPorQr || "https://cmar.live/sistemacmi/#/login?ticket=";
  const qrUrl = `${baseUrl}${qrCode}`;

  try {
    const qrImageBase64Encoded = await generarImagenQr(qrUrl);

    // 7a. Desactivar QR anteriores de la misma congregación
    await QrCodigos.update(
      { activo: false },
      {
        where: {
          idCongregacion,
          activo: true,
        },
      },
    );

    // 7b. Guardar en la base de datos el nuevo QR
    await QrCodigos.create({
      qrCode,
      descripcion: descripcion || null,
      idCongregacion,
      activo: true,
    });

    // 8. Responder al cliente
    res.json({
      ok: true,
      qrImage: qrImageBase64Encoded,
    });
  } catch (error) {
    console.error("Error generando el QR:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno, contacte al administrador",
    });
  }
};

interface IntentoQr {
  idQrCode?: number;
  idUsuario?: number;
  nombre?: string;
  esGuarda?: boolean;
  esCuidadora?: boolean;
  enTurnoGuarda?: boolean;
  puesto?: string | null;
  resultado: string;
  resultadoIdentidad: string;
  motivoRechazo?: string;
}

async function registrarIntentoQr(req: Request, datos: IntentoQr, transaction?: Transaction) {
  const userAgent = (req.get("user-agent") || "").slice(0, 500);
  const dispositivo = new DeviceDetector().parse(userAgent);
  await QrAccesos.create({
    ...datos,
    ip: req.ip || req.socket.remoteAddress || "",
    userAgent,
    dispositivo: `${dispositivo.os?.name || "Desconocido"} - ${dispositivo.device?.type || "Desconocido"}`,
  }, { transaction });
}

export const solicitarCodigoQr = async (req: Request, res: Response) => {
  const { qrCode, numeroMita } = req.body;
  const id = uuidv4();
  let desafioCreado = false;
  try {
    if (typeof qrCode !== "string" || qrCode.length > 255 ||
        typeof numeroMita !== "string" || !/^[1-9]\d{0,9}$/.test(numeroMita)) {
      await registrarIntentoQr(req, {
        resultado: "RECHAZADO", resultadoIdentidad: "NO_VERIFICADA", motivoRechazo: "DATOS_INVALIDOS",
      });
      return res.status(400).json({ ok: false, msg: "Revise los datos de acceso QR." });
    }

    const qr = await QrCodigos.findOne({ where: { qrCode, activo: true } });
    const congregacion = qr && await Congregacion.findOne({
      where: { id: qr.getDataValue("idCongregacion"), estado: true },
    });
    if (!qr || !congregacion) {
      await registrarIntentoQr(req, {
        resultado: "RECHAZADO", resultadoIdentidad: "NO_VERIFICADA", motivoRechazo: "QR_NO_DISPONIBLE",
      });
      return res.status(400).json({ ok: false, msg: "Código QR no válido o inactivo." });
    }

    const codigo = generarCodigoQr();
    const desde = new Date(Date.now() - 15 * 60000);
    const email = await db.transaction(async (transaction) => {
      const usuario = await Usuario.findOne({
        where: { id: Number(numeroMita), estado: ESTADO_USUARIO_ENUM.ACTIVO },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      const solicitudes = usuario && await DesafioAccesoQr.count({
        where: { idUsuario: usuario.getDataValue("id"), createdAt: { [Op.gte]: desde } },
        transaction,
      });
      if (!usuario || !usuario.getDataValue("email") || Number(solicitudes) >= 3) {
        await registrarIntentoQr(req, {
          idQrCode: qr.getDataValue("id"),
          resultado: "RECHAZADO", resultadoIdentidad: "NO_VERIFICADA",
          motivoRechazo: "IDENTIDAD_NO_DISPONIBLE_O_LIMITADA",
        }, transaction);
        return null;
      }
      await DesafioAccesoQr.create({
        id, idQrCode: qr.getDataValue("id"), idUsuario: usuario.getDataValue("id"),
        resumenCodigo: resumirCodigoQr(id, codigo),
        fechaExpiracion: new Date(Date.now() + MINUTOS_CODIGO_QR * 60000),
      }, { transaction });
      await registrarIntentoQr(req, {
        idQrCode: qr.getDataValue("id"), idUsuario: usuario.getDataValue("id"),
        resultado: "CODIGO_SOLICITADO", resultadoIdentidad: "PENDIENTE",
      }, transaction);
      return String(usuario.getDataValue("email"));
    });
    desafioCreado = email !== null;
    if (email) {
      const plantilla = fs.readFileSync(path.join(__dirname, "..", "templates", "codigoAccesoQr.html"), "utf8");
      const html = plantilla
        .replace("{{imagenEmail}}", environment.imagenEmail)
        .replace("{{codigo}}", codigo)
        .replace("{{minutos}}", String(MINUTOS_CODIGO_QR))
        .replace("{{horas}}", String(HORAS_SESION_QR));
      await enviarEmail(email, "Código de ingreso QR - CMAR LIVE", html, undefined, true);
    }
    return res.json({
      ok: true, desafio_id: id,
      msg: "Si los datos permiten el acceso, recibirá un código en el correo registrado. Puede solicitar hasta 3 códigos cada 15 minutos.",
    });
  } catch (error) {
    if (desafioCreado) {
      try {
        await DesafioAccesoQr.update({ fechaConsumo: new Date() }, { where: { id } });
        await registrarIntentoQr(req, {
          resultado: "RECHAZADO", resultadoIdentidad: "NO_VERIFICADA", motivoRechazo: "ENVIO_NO_DISPONIBLE",
        });
      } catch (errorRegistro) {
        console.error("[QR] No fue posible invalidar o auditar el desafío fallido.",
          errorRegistro instanceof Error ? errorRegistro.name : "Error desconocido");
      }
    }
    console.error("[QR] No fue posible solicitar el código de ingreso.", error instanceof Error ? error.name : "Error desconocido");
    return res.status(503).json({ ok: false, msg: "No fue posible procesar el código. Intente más tarde." });
  }
};

export const loginPorQr = async (req: Request, res: Response) => {
  const { qrCode, desafio_id, codigo, esGuarda, esCuidadora, enTurnoGuarda, puesto } = req.body;
  try {
    if (typeof qrCode !== "string" || qrCode.length > 255 ||
        typeof desafio_id !== "string" || !/^[a-f0-9-]{36}$/i.test(desafio_id) ||
        typeof codigo !== "string" || !/^\d{6}$/.test(codigo) ||
        !validarDatosQr(esGuarda, esCuidadora, enTurnoGuarda, puesto)) {
      await registrarIntentoQr(req, {
        resultado: "RECHAZADO", resultadoIdentidad: "NO_VERIFICADA", motivoRechazo: "DATOS_INVALIDOS",
      });
      return res.status(400).json({ ok: false, msg: "Revise el código y las respuestas de tipo de personal y puesto." });
    }

    if (esGuarda && !enTurnoGuarda) {
      await registrarIntentoQr(req, {
        esGuarda, esCuidadora, enTurnoGuarda, puesto: null,
        resultado: "RECHAZADO", resultadoIdentidad: "NO_VERIFICADA", motivoRechazo: "GUARDA_FUERA_DE_TURNO",
      });
      return res.status(403).json({
        ok: false, msg: "Si es guarda, debe estar actualmente en turno para ingresar mediante QR.",
      });
    }

    const respuesta = await db.transaction(async (transaction) => {
      const desafio = await DesafioAccesoQr.findByPk(desafio_id, {
        transaction, lock: transaction.LOCK.UPDATE,
      });
      const qr = await QrCodigos.findOne({
        where: { qrCode, activo: true }, transaction, lock: transaction.LOCK.SHARE,
      });
      const datosIntento = {
        idQrCode: qr?.getDataValue("id"),
        esGuarda, esCuidadora, enTurnoGuarda, puesto: puesto || null,
      };
      const rechazar = async (
        motivoRechazo: string,
        msg = "No fue posible verificar el acceso. Solicite otro código desde este formulario e intente nuevamente.",
      ) => {
        await registrarIntentoQr(req, {
          ...datosIntento, resultado: "RECHAZADO", resultadoIdentidad: "NO_VERIFICADA", motivoRechazo,
        }, transaction);
        return { rechazo: motivoRechazo, msg };
      };
      if (!desafio || !qr || desafio.getDataValue("idQrCode") !== qr.getDataValue("id")) {
        return rechazar("DESAFIO_NO_DISPONIBLE");
      }
      if (desafio.getDataValue("fechaConsumo")) {
        return rechazar("CODIGO_UTILIZADO",
          "Este código ya fue utilizado y no puede volver a usarse. Pulse «Solicitar otro código / cambiar número» para obtener uno nuevo.");
      }
      if (new Date(desafio.getDataValue("fechaExpiracion")).getTime() <= Date.now()) {
        return rechazar("CODIGO_VENCIDO",
          `Este código venció. Su validez es de ${MINUTOS_CODIGO_QR} minutos. Pulse «Solicitar otro código / cambiar número» para obtener uno nuevo.`);
      }
      if (desafio.getDataValue("intentosFallidos") >= MAX_INTENTOS_CODIGO_QR) {
        return rechazar("CODIGO_BLOQUEADO",
          `Este código fue bloqueado tras ${MAX_INTENTOS_CODIGO_QR} intentos incorrectos. Pulse «Solicitar otro código / cambiar número» para obtener uno nuevo.`);
      }
      if (!verificarCodigoQr(desafio_id, codigo, desafio.getDataValue("resumenCodigo"))) {
        const intentosRestantes = MAX_INTENTOS_CODIGO_QR - desafio.getDataValue("intentosFallidos") - 1;
        await desafio.increment("intentosFallidos", { transaction });
        if (intentosRestantes <= 0) {
          return rechazar("CODIGO_BLOQUEADO",
            `Este código fue bloqueado tras ${MAX_INTENTOS_CODIGO_QR} intentos incorrectos. Pulse «Solicitar otro código / cambiar número» para obtener uno nuevo.`);
        }
        return rechazar("CODIGO_NO_VALIDO",
          `El código no coincide con esta solicitud. Revise el correo correspondiente. Intentos restantes: ${intentosRestantes}.`);
      }
      const usuario = await Usuario.findOne({
        where: { id: desafio.getDataValue("idUsuario"), estado: ESTADO_USUARIO_ENUM.ACTIVO },
        transaction, lock: transaction.LOCK.SHARE,
      });
      const congregacion = await Congregacion.findOne({
        where: { id: qr.getDataValue("idCongregacion"), estado: true },
        transaction, lock: transaction.LOCK.SHARE,
      });
      if (!usuario || !congregacion) return rechazar("ACCESO_NO_AUTORIZADO");

      const nombre = ["primerNombre", "segundoNombre", "primerApellido", "segundoApellido"]
        .map((campo) => usuario.getDataValue(campo)).filter(Boolean).join(" ");
      const expiresAt = new Date(Date.now() + HORAS_SESION_QR * 3600000);
      const { sessionId } = await createQrSession({
        tipoEntidad: "congregacion", idCongregacion: congregacion.getDataValue("id"),
        idUsuario: usuario.getDataValue("id"), qrCode,
        ip: req.ip || req.socket.remoteAddress || "",
        userAgent: (req.get("user-agent") || "").slice(0, 500),
        expiresAt, transaction,
      });
      const email = congregacion.getDataValue("email") || "";
      const token = await generarJWT(congregacion.getDataValue("id"), email, sessionId, email, `${HORAS_SESION_QR}h`);
      await desafio.update({ fechaConsumo: new Date() }, { transaction });
      await registrarIntentoQr(req, {
        ...datosIntento, idUsuario: usuario.getDataValue("id"), nombre,
        resultado: "EXITOSO", resultadoIdentidad: "VERIFICADA",
      }, transaction);
      return { token, nombre, congregacion, sessionId, expiresAt };
    });
    if ("rechazo" in respuesta) {
      return res.status(401).json({ ok: false, code: respuesta.rechazo, msg: respuesta.msg });
    }
    guardarInformacionConexion(req.ip || req.socket.remoteAddress || "", req.get("user-agent") || "", null, respuesta.congregacion, true)
      .catch(() => console.error("[QR] No fue posible registrar la ubicación por IP."));
    return res.json({
      ok: true, token: respuesta.token, nombre: respuesta.nombre,
      congregacion: {
        id: respuesta.congregacion.getDataValue("id"),
        congregacion: respuesta.congregacion.getDataValue("congregacion"),
      },
      sessionInfo: {
        sessionId: respuesta.sessionId, sessionType: "QR", isLoginCodeQr: true, expiresAt: respuesta.expiresAt,
      },
    });
  } catch (error) {
    console.error("[QR] No fue posible completar el ingreso.", error instanceof Error ? error.name : "Error desconocido");
    return res.status(500).json({ ok: false, msg: "No fue posible completar el ingreso QR. Contacte al administrador." });
  }
};

export const getQrAccesos = async (req: Request, res: Response) => {
  try {
    // Obtener parámetros de paginación
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const offset = (page - 1) * limit;
    const camposTexto = ["usuario", "dispositivo", "ubicacion", "puesto", "motivoRechazo"] as const;
    const resultados = ["EXITOSO", "RECHAZADO", "CODIGO_SOLICITADO", "HISTORICO"];
    const identidades = ["VERIFICADA", "NO_VERIFICADA", "PENDIENTE", "SIN_REGISTRO"];
    const tiposAcceso = ["guarda", "cuidadora", "otro", "sin_registro"];
    const fechaValida = (valor: unknown): valor is string =>
      typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(valor) &&
      Number.isFinite(Date.parse(valor)) && new Date(valor).toISOString() === valor;

    // Validar parámetros
    if (!Number.isSafeInteger(page) || !Number.isSafeInteger(limit) || page < 1 || limit < 1 || limit > 100 ||
        (req.query.esGuarda !== undefined && (typeof req.query.esGuarda !== "string" || !["true", "false"].includes(req.query.esGuarda))) ||
        (req.query.esCuidadora !== undefined && (typeof req.query.esCuidadora !== "string" || !["true", "false"].includes(req.query.esCuidadora))) ||
        camposTexto.some((campo) => req.query[campo] !== undefined &&
          (typeof req.query[campo] !== "string" || String(req.query[campo]).trim().length === 0 ||
            String(req.query[campo]).length > 150)) ||
        (req.query.accesoDe !== undefined && (typeof req.query.accesoDe !== "string" || !tiposAcceso.includes(req.query.accesoDe))) ||
        (req.query.resultado !== undefined && (typeof req.query.resultado !== "string" || !resultados.includes(req.query.resultado))) ||
        (req.query.identidad !== undefined && (typeof req.query.identidad !== "string" || !identidades.includes(req.query.identidad))) ||
        (req.query.fechaDesde !== undefined && !fechaValida(req.query.fechaDesde)) ||
        (req.query.fechaHasta !== undefined && !fechaValida(req.query.fechaHasta)) ||
        (fechaValida(req.query.fechaDesde) && fechaValida(req.query.fechaHasta) &&
          req.query.fechaDesde >= req.query.fechaHasta)) {
      return res.status(400).json({
        ok: false,
        msg: "Filtros o paginación inválidos. Revise los valores y el rango de fechas (page >= 1, limit 1-100).",
      });
    }

    const condiciones: WhereOptions[] = [];
    const replacements: Record<string, string> = {};
    const contiene = (expresion: string, parametro: string, valor: string) => {
      replacements[parametro] = `%${valor.trim().replace(/[!%_]/g, "!$&")}%`;
      return literal(`${expresion} LIKE :${parametro} ESCAPE '!'`);
    };
    if (typeof req.query.usuario === "string") {
      const nombre = contiene("COALESCE(NULLIF(`QrAccesos`.`nombre`, ''), 'No verificada')", "usuario", req.query.usuario);
      const numeroMita = req.query.usuario.trim().replace(/^#/, "").replace(/[.,\s]/g, "");
      if (/^\d+$/.test(numeroMita) && Number.isSafeInteger(Number(numeroMita))) {
        condiciones.push({ [Op.or]: [nombre, { idUsuario: Number(numeroMita) }] });
      } else {
        condiciones.push(nombre);
      }
    }
    if (typeof req.query.dispositivo === "string") {
      condiciones.push(contiene("COALESCE(NULLIF(`QrAccesos`.`dispositivo`, ''), 'Sin registro')", "dispositivo", req.query.dispositivo));
    }
    if (typeof req.query.puesto === "string") {
      condiciones.push(contiene("COALESCE(NULLIF(`QrAccesos`.`puesto`, ''), NULLIF(`QrAccesos`.`tipoPuesto`, ''), 'Sin registro')",
        "puesto", req.query.puesto));
    }
    if (typeof req.query.motivoRechazo === "string") {
      condiciones.push(contiene("COALESCE(NULLIF(`QrAccesos`.`motivoRechazo`, ''), 'Sin registro')", "motivoRechazo", req.query.motivoRechazo));
    }
    if (typeof req.query.ubicacion === "string") {
      // La misma última ubicación por IP que se muestra en cada fila, sin multiplicar accesos.
      condiciones.push(contiene(`COALESCE(NULLIF((SELECT CONCAT_WS(', ', NULLIF(u.ciudad, ''), NULLIF(u.pais, ''))
        FROM ubicacionConexion u WHERE u.ip = \`QrAccesos\`.\`ip\`
        ORDER BY u.createdAt DESC, u.id DESC LIMIT 1), ''), 'Sin registro')`,
      "ubicacion", req.query.ubicacion));
    }
    if (req.query.accesoDe === "guarda") condiciones.push({ esGuarda: true });
    if (req.query.accesoDe === "cuidadora") condiciones.push({ esCuidadora: true, [Op.or]: [{ esGuarda: false }, { esGuarda: null }] });
    if (req.query.accesoDe === "otro") condiciones.push({ esGuarda: false, esCuidadora: false });
    if (req.query.accesoDe === "sin_registro") {
      condiciones.push({
        [Op.or]: [
          { esGuarda: null, esCuidadora: { [Op.or]: [false, null] } },
          { esGuarda: false, esCuidadora: null },
        ],
      });
    }
    if (req.query.resultado !== undefined) {
      condiciones.push({ resultado: req.query.resultado === "HISTORICO" ? { [Op.or]: [null, ""] } : req.query.resultado });
    }
    if (req.query.identidad !== undefined) {
      condiciones.push({ resultadoIdentidad: req.query.identidad === "SIN_REGISTRO" ? { [Op.or]: [null, ""] } : req.query.identidad });
    }
    if (typeof req.query.fechaDesde === "string") condiciones.push({ createdAt: { [Op.gte]: new Date(req.query.fechaDesde) } });
    if (typeof req.query.fechaHasta === "string") condiciones.push({ createdAt: { [Op.lt]: new Date(req.query.fechaHasta) } });

    // Realizar consulta para obtener accesos con login QR
    const { count, rows: accesos } = await QrAccesos.findAndCountAll({
      where: {
        ...(req.query.esGuarda !== undefined ? { esGuarda: req.query.esGuarda === "true" } : {}),
        ...(req.query.esCuidadora !== undefined ? { esCuidadora: req.query.esCuidadora === "true" } : {}),
        ...(condiciones.length ? { [Op.and]: condiciones } : {}),
      },
      replacements,
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit, offset,
    });

    const ips = [...new Set(accesos.map((acceso) => acceso.getDataValue("ip") as string).filter(Boolean))];
    const ubicaciones = new Map(await Promise.all(ips.map(async (ip) => {
      const ubicacion = await UbicacionConexion.findOne({
        attributes: ["ciudad", "pais"],
        where: { ip },
        order: [["createdAt", "DESC"], ["id", "DESC"]],
      });
      return [ip, ubicacion ? {
        ciudad: ubicacion.getDataValue("ciudad") || null,
        pais: ubicacion.getDataValue("pais") || null,
      } : null] as const;
    })));
    const data = accesos.map((acceso) => ({
      ...acceso.toJSON(),
      ubicacion: ubicaciones.get(acceso.getDataValue("ip")) || null,
    }));

    // Calcular metadata de paginación
    const totalPages = Math.ceil(count / limit);

    // Devolver resultados con status 200
    return res.status(200).json({
      ok: true,
      msg: "Accesos obtenidos correctamente mediante código QR.",
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener accesos QR:", error);

    return res.status(500).json({
      ok: false,
      msg: "Ocurrió un error al consultar los accesos QR.",
      error: error.message || "Error desconocido",
    });
  }
};
