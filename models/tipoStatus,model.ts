import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoStatus = db.define(
  "TipoStatus",
  {
    status: {
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
    tableName: "tipoStatus",
  }
);

export default TipoStatus;
