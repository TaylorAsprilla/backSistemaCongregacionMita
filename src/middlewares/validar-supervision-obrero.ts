import { NextFunction, Request, Response } from "express";
import { CustomRequest } from "./validar-jwt";
import {
  ContextoObrero,
  obtenerContextoObrero,
} from "../services/supervisionObrero.authorization";

export type RequestSupervisionObrero = CustomRequest & {
  contextoObrero?: ContextoObrero;
};

const validarSupervisionObrero = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const usuarioId = (req as CustomRequest).id;
  if (!usuarioId) {
    return res.status(401).json({ ok: false, msg: "Usuario no autenticado." });
  }

  try {
    const contexto = await obtenerContextoObrero(usuarioId);
    if (!contexto) {
      return res.status(403).json({
        ok: false,
        msg: "No tiene unidades de Ciudad o Campo asignadas para consultar este dashboard.",
      });
    }

    (req as RequestSupervisionObrero).contextoObrero = contexto;
    return next();
  } catch (error) {
    console.error("[SUPERVISION-OBRERO] Error validando asignaciones:", error);
    return res.status(500).json({
      ok: false,
      msg: "No fue posible validar las unidades asignadas.",
    });
  }
};

export default validarSupervisionObrero;
