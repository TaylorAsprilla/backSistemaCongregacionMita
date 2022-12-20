import { DataTypes } from "sequelize";
import db from "../database/connection";

const AccesoMultimedia = db.define(
  "AccesosMultimedia",
  {
    login: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    solicitud_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tiempoAprobacion: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "accesosMultimedia",
  }
);

export default AccesoMultimedia;
