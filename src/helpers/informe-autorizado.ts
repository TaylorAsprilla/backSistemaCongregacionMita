import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import Informe from "../models/informe.model";
import InformeResponsable from "../models/informeResponsable.model";
import { ROLES_ID } from "../enum/roles.enum";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";
import { obtenerPermisosUsuario } from "../services/dashboardSupervision/consultas";
import {
  obtenerContextoObreroPais,
  obtenerObrerosAsignadosAlPais,
} from "../services/supervisionPais.authorization";
import { obtenerAmbitosResponsabilidad } from "../services/informeResponsables";

type AuthenticatedRequest = Request & { id?: number };

export const obtenerInformeAutorizado = async (
  req: Request,
  informeId: string,
) => {
  const usuarioId = (req as AuthenticatedRequest).id;

  if (!usuarioId) {
    return null;
  }

  const permisos = await obtenerPermisosUsuario(usuarioId);
  if (permisos.includes(ROLES_ID.ADMINISTRADOR)) {
    return Informe.findOne({ where: { id: informeId } });
  }

  const contexto = await obtenerContextoObreroPais(usuarioId);
  const usuariosAutorizados = contexto
    ? [usuarioId, ...await obtenerObrerosAsignadosAlPais(contexto.paises)]
    : [usuarioId];
  const informePorPropietario = await Informe.findOne({
    where: {
      id: informeId,
      usuario_id: { [Op.in]: usuariosAutorizados },
    },
  });
  if (informePorPropietario) return informePorPropietario;

  const informe = await Informe.findOne({ where: { id: informeId } });
  if (!informe) return null;

  const tipoCongregacion = informe.getDataValue("tipo_congregacion");
  const congregacionId = Number(informe.getDataValue("congregacion_id"));
  if (
    (tipoCongregacion === "PAIS" ||
      tipoCongregacion === "CONGREGACION" ||
      tipoCongregacion === "CAMPO") &&
    Number.isInteger(congregacionId)
  ) {
    const ambitos = await obtenerAmbitosResponsabilidad(usuarioId);
    if (
      ambitos.some(
        (ambito) =>
          ambito.tipo_congregacion === tipoCongregacion &&
          ambito.congregacion_id === congregacionId,
      )
    ) {
      return informe;
    }
  }

  if (
    informe.getDataValue("estado") === ESTADO_INFORME_ENUM.CERRADO &&
    (await InformeResponsable.findOne({
      where: {
        informe_id: informe.getDataValue("id"),
        usuario_id: usuarioId,
      },
    }))
  ) {
    return informe;
  }

  console.warn("[INFORME_AUTH] DENEGADO", {
    usuarioId,
    informeId,
    esObreroPais: contexto !== null,
    paises: contexto?.paises ?? [],
    totalUsuariosAutorizados: usuariosAutorizados.length,
  });
  return null;
};

export const esResponsableActualDelInforme = async (
  usuarioId: number,
  informe: Awaited<ReturnType<typeof Informe.findByPk>>,
): Promise<boolean> => {
  if (!informe) return false;
  if (Number(informe.getDataValue("usuario_id")) === usuarioId) return true;
  const permisos = await obtenerPermisosUsuario(usuarioId);
  if (permisos.includes(ROLES_ID.ADMINISTRADOR)) return true;

  const tipoCongregacion = informe.getDataValue("tipo_congregacion");
  const congregacionId = Number(informe.getDataValue("congregacion_id"));
  if (
    (tipoCongregacion !== "PAIS" &&
      tipoCongregacion !== "CONGREGACION" &&
      tipoCongregacion !== "CAMPO") ||
    !Number.isInteger(congregacionId) ||
    congregacionId <= 0
  ) {
    return false;
  }
  const ambitos = await obtenerAmbitosResponsabilidad(usuarioId);
  return ambitos.some(
    (ambito) =>
      ambito.tipo_congregacion === tipoCongregacion &&
      ambito.congregacion_id === congregacionId,
  );
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
