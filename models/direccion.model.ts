import { DataTypes } from "sequelize";
import db from "../database/connection";

const Direccion = db.define(
  "Direccion",
  {
    direccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departamento: {
      type: DataTypes.STRING,
    },
    codigoPostal: {
      type: DataTypes.STRING,
    },
    tipoDireccion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "direccion",
  }
);

export default Direccion;
