import { NextFunction, Request, Response } from "express";
import Informe from "../models/informe.model";

type AuthenticatedRequest = Request & { id?: number };

export const obtenerInformeAutorizado = async (
  req: Request,
  informeId: string,
) => {
  const usuarioId = (req as AuthenticatedRequest).id;

  if (!usuarioId) {
    return null;
  }

  return Informe.findOne({
    where: {
      id: informeId,
      usuario_id: usuarioId,
    },
  });
};

export const cargarInformeIdDesdeQuery = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { informeId } = req.query;

  if (typeof informeId !== "string" || !informeId.trim()) {
    return res.status(400).json({
      ok: false,
      msg: "El parámetro informeId es obligatorio",
    });
  }

  req.params.informeId = informeId;
  return next();
};
