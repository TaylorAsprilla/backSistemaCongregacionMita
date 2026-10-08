import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import Informe from "../models/informe.model";
import {
  obtenerContextoObreroPais,
  obtenerObrerosAsignadosAlPais,
} from "../services/supervisionPais.authorization";

type AuthenticatedRequest = Request & { id?: number };

export const obtenerInformeAutorizado = async (
  req: Request,
  informeId: string,
) => {
  const usuarioId = (req as AuthenticatedRequest).id;

  if (!usuarioId) {
    return null;
  }

  const contexto = await obtenerContextoObreroPais(usuarioId);
  const usuariosAutorizados = contexto
    ? [usuarioId, ...await obtenerObrerosAsignadosAlPais(contexto.paises)]
    : [usuarioId];
  if (!usuariosAutorizados.length) return null;

  const informe = await Informe.findOne({
    where: {
      id: informeId,
      usuario_id: { [Op.in]: usuariosAutorizados },
    },
  });

  if (!informe) {
    console.warn("[INFORME_AUTH] DENEGADO", {
      usuarioId,
      informeId,
      esObreroPais: contexto !== null,
      paises: contexto?.paises ?? [],
      totalUsuariosAutorizados: usuariosAutorizados.length,
    });
  }

  return informe;
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
