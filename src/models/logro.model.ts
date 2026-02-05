import { DataTypes } from "sequelize";
import db from "../database/connection";

const Logro = db.define(
  "Logro",
  {
    logro: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    responsable: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    comentarios: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "logro",
  },
);

export default Logro;
