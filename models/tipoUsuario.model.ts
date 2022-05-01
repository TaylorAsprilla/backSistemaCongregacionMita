import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoUsuario = db.define(
  "TipoUsuario",
  {
    tipo: {
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
    tableName: "tipoUsuario",
  }
);

export default TipoUsuario;
