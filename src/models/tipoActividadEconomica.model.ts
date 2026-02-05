import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoActividadEconomica = db.define(
  "TipoActividadEconomica",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "tipoActividadEconomica",
  },
);

export default TipoActividadEconomica;
