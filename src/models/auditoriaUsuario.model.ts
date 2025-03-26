import { DataTypes } from "sequelize";
import db from "../database/connection";
import { AUDITORIAUSUARIO_ENUM } from "../enum/auditoriaUsuario.enum";

const AuditoriaUsuario = db.define(
  "AuditoriaUsuario",
  {
    accion: {
      type: DataTypes.ENUM(
        AUDITORIAUSUARIO_ENUM.CREACION,
        AUDITORIAUSUARIO_ENUM.ACTUALIZACION,
        AUDITORIAUSUARIO_ENUM.ELIMINACION,
        AUDITORIAUSUARIO_ENUM.DESACTIVACION,
        AUDITORIAUSUARIO_ENUM.ACTIVACION,
        AUDITORIAUSUARIO_ENUM.APROBAR_SOLICITUD,
        AUDITORIAUSUARIO_ENUM.DENEGAR_SOLICITUD,
        AUDITORIAUSUARIO_ENUM.TRANSFERENCIA,
        AUDITORIAUSUARIO_ENUM.TRANSCENDIO
      ),
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Usuario Registrado, actualizado, eliminado o deshabilitado",
    },
    usuarioQueRegistra_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Usuario que realiza la accion",
    },
  },
  {
    freezeTableName: true,
    tableName: "auditoriaUsuario",
  }
);

export default AuditoriaUsuario;
