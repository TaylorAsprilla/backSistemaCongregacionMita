import { DataTypes } from "sequelize";
import db from "../database/connection";

const QrAccesos = db.define(
  "QrAccesos",
  {
    idQrCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idUsuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipoPuesto: {
      type: DataTypes.STRING,
      allowNull: false,
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
  },
  {
    tableName: "qrAccesos",
    timestamps: true,
  }
);

export default QrAccesos;
