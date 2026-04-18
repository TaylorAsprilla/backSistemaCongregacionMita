import { DataTypes } from "sequelize";
import db from "../database/connection";

const CategoriaActividadEspiritual = db.define(
  "CategoriaActividadEspiritual",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "categoriaActividadEspiritual",
  },
);

export default CategoriaActividadEspiritual;
