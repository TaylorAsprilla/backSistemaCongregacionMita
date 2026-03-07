import { DataTypes } from "sequelize";
import db from "../database/connection";

const CategoriaProfesion = db.define(
  "CategoriaProfesion",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "categoriaProfesion",
  },
);

export default CategoriaProfesion;
