import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoActividadEclesiastico = db.define(
  "TipoActividadEclesiastico",
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
    tableName: "tipoActividadEclesiastico",
  },
);

export default TipoActividadEclesiastico;
