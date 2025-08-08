import { Request, Response } from "express";
import QrCodigos from "../models/qrCodigos.model";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import useragent from "useragent";
import generarJWT from "../helpers/tokenJwt";
import QrAccesos from "../models/qrAccesos";
import Congregacion from "../models/congregacion.model";
import config from "../config/config";
import sharp from "sharp";
import axios from "axios";
import { guardarInformacionConexion } from "../helpers/guardarInformacionConexion";
import UbicacionConexion from "../models/ubicacionConexion.model";

const environment = config[process.env.NODE_ENV || "development"];

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

    // Generar la imagen del QR como buffer
    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      width: 800,
      margin: 2,
      color: {
        dark: "#1976d2",
        light: "#ffffff",
      },
    });

    // Cargar el QR generado con Sharp
    let qrImage = sharp(qrBuffer);

    // Cargar el logo desde la URL
    const logoUrl =
      environment.logoQR ||
      "https://cmar.live/sistemacmi/assets/images/escudo-congregacion-mita.jpg";
    const logoResponse = await axios.get(logoUrl, {
      responseType: "arraybuffer",
    });

    // Convertir la respuesta de axios a un buffer que Sharp pueda usar
    const logoBuffer = Buffer.from(logoResponse.data);

    // Redimensionar el logo
    const resizedLogo = await sharp(logoBuffer).resize(100, 100).toBuffer();

    // Componer el logo en el centro del QR
    qrImage = qrImage.composite([
      {
        input: resizedLogo,
        gravity: "center", // Coloca el logo en el centro del QR
      },
    ]);

    // Convertir la imagen final a base64
    const qrImageBase64 = await qrImage.png().toBuffer();
    const qrImageBase64Encoded = qrImageBase64.toString("base64");

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
    // 1. Generar imagen del QR como buffer
    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      width: 800,
      margin: 2,
      color: {
        dark: "#1976d2",
        light: "#ffffff",
      },
    });

    // 2. Cargar el QR generado con Sharp
    let qrImage = sharp(qrBuffer);

    // 3. Cargar el logo desde la URL
    const logoUrl =
      environment.logoQR ||
      "https://cmar.live/sistemacmi/assets/images/escudo-congregacion-mita.jpg";
    const logoResponse = await axios.get(logoUrl, {
      responseType: "arraybuffer",
    });

    // Convertir la respuesta de axios a un buffer que Sharp pueda usar
    const logoBuffer = Buffer.from(logoResponse.data);

    // 4. Redimensionar el logo (ajusta según necesidad)
    const resizedLogo = await sharp(logoBuffer).resize(100, 100).toBuffer();

    // 5. Componer el logo en el centro del QR
    qrImage = qrImage.composite([
      {
        input: resizedLogo,
        gravity: "center", // Coloca el logo en el centro del QR
      },
    ]);

    // 6. Convertir la imagen final a base64
    const qrImageBase64 = await qrImage.png().toBuffer();
    const qrImageBase64Encoded = qrImageBase64.toString("base64");

    // 7a. Desactivar QR anteriores de la misma congregación
    await QrCodigos.update(
      { activo: false },
      {
        where: {
          idCongregacion,
          activo: true,
        },
      }
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

export const loginPorQr = async (req: Request, res: Response) => {
  const { qrCode, numeroMita, nombre, tipoPuesto } = req.body;

  const ip = (
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    ""
  ).toString();
  const userAgentRaw = req.headers["user-agent"] || "";
  const agent = useragent.parse(userAgentRaw);

  if (!qrCode || !nombre || !numeroMita || !tipoPuesto) {
    return res.status(400).json({ ok: false, msg: "Datos incompletos" });
  }

  try {
    const qr = await QrCodigos.findOne({
      where: { qrCode, activo: true },
      include: [{ model: Congregacion }],
    });

    if (!qr || !qr.get("idCongregacion")) {
      return res
        .status(404)
        .json({ ok: false, msg: "Código QR no válido o inactivo" });
    }

    const congregacion = await Congregacion.findByPk(
      qr.getDataValue("idCongregacion")
    );

    if (!congregacion) {
      return res
        .status(404)
        .json({ ok: false, msg: "Congregación no encontrada" });
    }

    // Generar token JWT
    const token = await generarJWT(
      congregacion.getDataValue("id"),
      congregacion.getDataValue("email")
    );

    // Guardar el acceso
    await QrAccesos.create({
      idQrCode: qr.getDataValue("id"),
      nombre,
      idUsuario: numeroMita,
      tipoPuesto,
      ip, // Ensure ip is a string
      userAgent: userAgentRaw,
      dispositivo: `${agent.os.toString()} - ${agent.device.toString()}`,
    });

    // Guardar información extendida de conexión
    guardarInformacionConexion(
      ip,
      userAgentRaw,
      null,
      congregacion,
      true
    ).catch((err) =>
      console.error("Error al guardar información de conexión:", err)
    );

    console.info(
      `Login QR exitoso: ${nombre}, Congregación: ${congregacion.getDataValue(
        "congregacion"
      )}, IP: ${ip}, Dispositivo: ${agent.os} - ${agent.device}`
    );

    res.json({
      ok: true,
      token,
      congregacion,
      nombre,
    });
  } catch (error) {
    console.error("Error al hacer login por QR:", error);
    res.status(500).json({ ok: false, msg: "Error interno" });
  }
};

export const getQrAccesos = async (req: Request, res: Response) => {
  try {
    // Realizar consulta para obtener accesos con login QR
    const accesos = await obtenerAccesosQr();

    // Validar si no se encontraron accesos
    if (accesos.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "No se encontraron accesos QR.",
        data: [],
      });
    }

    // Devolver resultados con status 200
    return res.status(200).json({
      ok: true,
      msg: "Accesos obtenidos correctamente mediante código QR.",
      data: accesos,
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

// Función para obtener los accesos QR con las relaciones necesarias
const obtenerAccesosQr = async () => {
  return await UbicacionConexion.findAll({
    where: { isLoginCodeQr: true }, // Filtrar accesos QR
    attributes: [
      "ip",
      "dispositivo",
      "createdAt",
      "isLoginCodeQr",
      "idCongregacion",
      "pais",
      "ciudad",
    ],
    order: [["createdAt", "DESC"]], // Ordenar por fecha descendente
    include: [
      {
        model: QrAccesos,
        as: "qrAcceso", // Alias que definiste en la asociación
        attributes: ["nombre"], // Obtener solo el nombre
        required: false, // LEFT JOIN
      },
      {
        model: Congregacion,
        as: "congregacion", // Alias para Congregacion
        attributes: ["congregacion"], // Información de la congregación
        required: false,
      },
    ],
  });
};
