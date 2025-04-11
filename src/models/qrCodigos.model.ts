import { DataTypes } from "sequelize";
import db from "../database/connection";

const QrCodigos = db.define(
  "QrCodigos",
  {
    qrCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    idCongregacion: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "qrCodigos",
  }
);

export default QrCodigos;
