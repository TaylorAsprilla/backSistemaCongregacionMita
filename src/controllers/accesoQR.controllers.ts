import { Request, Response } from "express";
import QrCodigos from "../models/qrCodigos.model";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import useragent from "useragent";
import generarJWT from "../helpers/tokenJwt";
import QrAccesos from "../models/qrAccesos";
import Congregacion from "../models/congregacion.model";

export const generarQrCode = async (req: Request, res: Response) => {
  const { idCongregacion, descripcion } = req.body;

  if (!idCongregacion) {
    return res.status(400).json({ ok: false, msg: "idCongregacion requerido" });
  }

  const randomId = uuidv4().slice(0, 6).toUpperCase();
  const year = new Date().getFullYear();
  const qrCode = `QR-CMARLIVE-${year}-${randomId}`;

  try {
    // Generar imagen QR (base64)
    const qrImage = await QRCode.toDataURL(qrCode);

    // Guardar en BD
    await QrCodigos.create({
      qrCode,
      descripcion,
      idCongregacion,
    });

    res.json({
      ok: true,
      qrCode,
      qrImage,
    });
  } catch (error) {
    console.error("Error generando el QR:", error);
    res.status(500).json({ ok: false, msg: "Error al generar el QR" });
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
    const qr = await QrCodigos.findOne({ where: { qrCode, activo: true } });

    if (!qr) {
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
    });
  } catch (error) {
    console.error("Error al hacer login por QR:", error);
    res.status(500).json({ ok: false, msg: "Error interno" });
  }
};
