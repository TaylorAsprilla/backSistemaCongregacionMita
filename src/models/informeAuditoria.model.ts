import { DataTypes } from "sequelize";
import db from "../database/connection";

const InformeAuditoria = db.define(
  "InformeAuditoria",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    informe_id: { type: DataTypes.INTEGER, allowNull: false },
    seccion: { type: DataTypes.STRING(40), allowNull: false },
    registro_id: { type: DataTypes.INTEGER, allowNull: true },
    accion: { type: DataTypes.STRING(30), allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    cambios: { type: DataTypes.JSON, allowNull: true },
    fecha: { type: DataTypes.DATE, allowNull: false },
  },
  {
    freezeTableName: true,
    tableName: "informeAuditoria",
    timestamps: false,
  },
);

export default InformeAuditoria;
