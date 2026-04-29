import { DataTypes } from "sequelize";
import db from "../database/connection";
import { AUDITORIA_EVENTO_EN_VIVO_ENUM } from "../enum/auditoriaEventoEnVivo.enum";

const AuditoriaEventoEnVivo = db.define(
  "AuditoriaEventoEnVivo",
  {
    accion: {
      type: DataTypes.ENUM(
        AUDITORIA_EVENTO_EN_VIVO_ENUM.CREACION,
        AUDITORIA_EVENTO_EN_VIVO_ENUM.ACTUALIZACION,
        AUDITORIA_EVENTO_EN_VIVO_ENUM.ELIMINACION,
        AUDITORIA_EVENTO_EN_VIVO_ENUM.ACTIVACION,
      ),
      allowNull: false,
    },
    eventoEnVivo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment:
        "Evento en vivo que fue creado, actualizado, eliminado o activado",
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Usuario que realiza la acción",
    },
  },
  {
    freezeTableName: true,
    tableName: "auditoriaEventoEnVivo",
  },
);

export default AuditoriaEventoEnVivo;
