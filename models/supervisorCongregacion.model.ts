import { DataTypes } from "sequelize/types";
import db from "../database/connection";

const SupervisorCongregacion = db.define(
  "supervisorCongregacion",
  {
    obrero_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pais_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    tableName: "supervisorCongregacion",
  }
);

export default SupervisorCongregacion;
