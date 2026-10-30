import { DataTypes } from "sequelize";
import db from "../database/connection";

const QrAccesos = db.define(
  "QrAccesos",
  {
    idQrCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    idUsuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "usuario",
        key: "id",
      },
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tipoPuesto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dispositivo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    esGuarda: { type: DataTypes.BOOLEAN, allowNull: true },
    esCuidadora: { type: DataTypes.BOOLEAN, allowNull: true },
    enTurnoGuarda: { type: DataTypes.BOOLEAN, allowNull: true },
    puesto: { type: DataTypes.STRING(50), allowNull: true },
    resultado: { type: DataTypes.STRING(30), allowNull: true },
    resultadoIdentidad: { type: DataTypes.STRING(30), allowNull: true },
    motivoRechazo: { type: DataTypes.STRING(80), allowNull: true },
  },
  {
    tableName: "qrAccesos",
    timestamps: true,
  },
);

export default QrAccesos;
