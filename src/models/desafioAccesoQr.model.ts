import { DataTypes } from "sequelize";
import db from "../database/connection";

const DesafioAccesoQr = db.define("DesafioAccesoQr", {
  id: { type: DataTypes.UUID, primaryKey: true },
  idQrCode: { type: DataTypes.INTEGER, allowNull: false },
  idUsuario: { type: DataTypes.INTEGER, allowNull: false },
  resumenCodigo: { type: DataTypes.STRING(64), allowNull: false },
  intentosFallidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  fechaExpiracion: { type: DataTypes.DATE, allowNull: false },
  fechaConsumo: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "desafioAccesoQr",
  freezeTableName: true,
});

export default DesafioAccesoQr;
