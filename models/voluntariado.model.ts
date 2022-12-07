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
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "voluntariado",
  }
);

export default Voluntariado;
