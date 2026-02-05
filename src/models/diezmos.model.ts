import { DataTypes } from "sequelize";
import db from "../database/connection";

const Diezmos = db.define(
  "Diezmos",
  {
    sobresRestrictos: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sobresNoRestrictos: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    restrictos: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    noRestrictos: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    mes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "diezmos",
  },
);

export default Diezmos;
