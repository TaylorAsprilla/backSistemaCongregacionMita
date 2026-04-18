import { DataTypes } from "sequelize";
import db from "../database/connection";

const AsuntoPendiente = db.define(
  "AsuntoPendiente",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    asunto: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    responsable: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    fechaLimite: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaResolucion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    asuntoOriginal_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Referencia al asunto original si es una continuación",
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipoStatus_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "asuntoPendiente",
  },
);

export default AsuntoPendiente;
