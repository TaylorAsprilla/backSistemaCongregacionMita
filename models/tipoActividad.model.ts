import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoActividad = db.define(
  "TipoActividad",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    idSeccion: {
      type: DataTypes.INTEGER,
      // allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "tipoActividad",
  }
);

export default TipoActividad;
