import { DataTypes } from "sequelize";
import db from "../database/connection";

const Meta = db.define(
  "Meta",
  {
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    meta: {
      type: DataTypes.STRING,
    },
    accion: {
      type: DataTypes.TEXT,
    },
    comentarios: {
      type: DataTypes.TEXT,
    },
    fechaCumplimiento: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metaOriginal_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Referencia a la meta original si es una copia/continuación",
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipoStatus_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "meta",
  },
);

export default Meta;
