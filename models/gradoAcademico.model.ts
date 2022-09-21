import { DataTypes } from "sequelize";
import db from "../database/connection";

const GradoAcademico = db.define(
  "GradoAcademico",
  {
    gradoAcademico: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "gradoAcademico",
  }
);

export default GradoAcademico;
