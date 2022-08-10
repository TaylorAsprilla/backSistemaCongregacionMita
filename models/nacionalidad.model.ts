import { DataTypes } from "sequelize";
import db from "../database/connection";

const Nacionalidad = db.define(
  "Nacionalidad",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    iso2: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    iso3: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefonoCode: {
      type: DataTypes.INTEGER,
    },
  },
  {
    freezeTableName: true,
    tableName: "nacionalidad",
  }
);

export default Nacionalidad;
