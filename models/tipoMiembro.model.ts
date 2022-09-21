import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoMiembro = db.define(
  "TipoMiembro",
  {
    miembro: {
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
    tableName: "tipoMiembro",
  }
);

export default TipoMiembro;
