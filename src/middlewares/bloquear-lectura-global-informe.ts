import { NextFunction, Response } from "express";
import { CustomRequest } from "./validar-jwt";
import { obtenerContextoObreroPais } from "../services/supervisionPais.authorization";

const bloquearLecturaGlobalInforme = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.id) {
    return res.status(401).json({ ok: false, msg: "Usuario no autenticado." });
  }

  try {
    const contexto = await obtenerContextoObreroPais(req.id);
    if (contexto) {
      return res.status(403).json({
        ok: false,
        msg: "Consulte los datos mediante el informe autorizado.",
      });
    }
    return next();
  } catch (error) {
    console.error("[SUPERVISION-PAIS] Error validando acceso a informes:", error);
    return res.status(500).json({
      ok: false,
      msg: "No fue posible validar el acceso al informe.",
    });
  }
};

export default bloquearLecturaGlobalInforme;
