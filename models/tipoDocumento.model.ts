import { DataTypes } from "sequelize";
import db from "../database/connection";

const TipoDocumento = db.define(
  "TipoDocumento",
  {
    documento: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    pais_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "tipoDocumento",
  }
);

export default TipoDocumento;
