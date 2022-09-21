import { DataTypes } from "sequelize";
import db from "../database/connection";

const Voluntariado = db.define(
  "Voluntariado",
  {
    nombreVoluntariado: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "voluntariado",
  }
);

export default Voluntariado;
