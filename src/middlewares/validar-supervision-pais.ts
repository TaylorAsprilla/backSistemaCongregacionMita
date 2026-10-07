import { NextFunction, Response } from "express";
import { CustomRequest } from "./validar-jwt";
import { obtenerContextoObreroPais } from "../services/supervisionPais.authorization";

const validarSupervisionPais = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.id) {
    return res.status(401).json({ ok: false, msg: "Usuario no autenticado." });
  }

  try {
    const contexto = await obtenerContextoObreroPais(req.id);
    if (!contexto) {
      return res.status(403).json({
        ok: false,
        msg: "No tiene permiso para acceder a la supervisión del país.",
      });
    }
    if (contexto.paises.length !== 1) {
      return res.status(403).json({
        ok: false,
        msg: "Se requiere exactamente un país activo asignado para usar esta supervisión.",
      });
    }

    req.paisSupervisionId = contexto.paises[0];
    return next();
  } catch (error) {
    console.error("[SUPERVISION-PAIS] Error validando el alcance del usuario:", error);
    return res.status(500).json({
      ok: false,
      msg: "No fue posible validar el país asignado.",
    });
  }
};

export default validarSupervisionPais;
