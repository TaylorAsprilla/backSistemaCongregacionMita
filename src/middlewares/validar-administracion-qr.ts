import { NextFunction, Response } from "express";
import { Op } from "sequelize";
import { CustomRequest } from "./validar-jwt";
import { crearValidadorRoles } from "./validar-roles";
import UserSession from "../models/userSession.model";
import Usuario from "../models/usuario.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import Permiso from "../models/permiso.model";
import { ROLES_ID } from "../enum/roles.enum";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";

const validarRolesQr = crearValidadorRoles([
  ROLES_ID.ADMINISTRADOR, ROLES_ID.ASISTENTE_OOTS, ROLES_ID.COMITE_RECTOR,
], async (usuarioId) => {
  const asignaciones = await UsuarioPermiso.findAll({ where: { usuario_id: usuarioId } });
  const permisos = await Permiso.findAll({
    where: { id: { [Op.in]: asignaciones.map((p) => p.getDataValue("permiso_id")) }, estado: true },
  });
  return permisos.map((p) => String(p.getDataValue("id")));
});

export default async function validarAdministracionQr(req: CustomRequest, res: Response, next: NextFunction) {
  try {
    const sesion = await UserSession.findOne({
      where: { sessionId: req.sessionId, tipoEntidad: "usuario", sessionType: "NORMAL", isActive: true },
    });
    const usuario = sesion && await Usuario.findOne({
      where: { id: req.id, estado: ESTADO_USUARIO_ENUM.ACTIVO },
    });
    if (!sesion || sesion.getDataValue("idUsuario") !== req.id || !usuario) {
      return res.status(403).json({ ok: false, msg: "Se requiere una sesión administrativa de usuario." });
    }
    return validarRolesQr(req, res, next);
  } catch (error) {
    console.error("[QR] No fue posible comprobar los permisos administrativos.");
    return res.status(500).json({ ok: false, msg: "No fue posible validar los permisos." });
  }
}
