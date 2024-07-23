import { DataTypes } from "sequelize";
import db from "../database/connection";

const Congregacion = db.define(
  "Congregacion",
  {
    congregacion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    pais_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idObreroEncargado: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    idObreroEncargadoDos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    password: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "congregacion",
  }
);

export default Congregacion;
