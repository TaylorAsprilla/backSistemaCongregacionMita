import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoEstudio = db.define(
  "TipoEstudio",
  {
    estudio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "tipoEstudio",
  }
);

export default TipoEstudio;
