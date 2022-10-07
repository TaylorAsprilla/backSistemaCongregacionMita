import { DataTypes } from "sequelize";
import db from "../database/connection";

const Familiares = db.define(
  "Familiares",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING,
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    pais: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "familiares",
  }
);

export default Familiares;
