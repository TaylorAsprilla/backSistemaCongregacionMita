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

const environment = config[process.env.NODE_ENV || "development"];

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
    const logoUrl = environment.imagenEmail;
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
  const { qrCode, nombre } = req.body;
  const ip =
    req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgentRaw = req.headers["user-agent"] || "";
  const agent = useragent.parse(userAgentRaw);

  if (!qrCode || !nombre) {
    return res
      .status(400)
      .json({ ok: false, msg: "qrCode y nombre requeridos" });
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
      ip,
      userAgent: userAgentRaw,
      dispositivo: `${agent.os.toString()} - ${agent.device.toString()}`,
    });

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
