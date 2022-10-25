import { DataTypes } from "sequelize";
import db from "../database/connection";

const LinkEvento = db.define(
  "LinkEvento",
  {
    link: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipoEvento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "linkEvento",
  }
);

export default LinkEvento;
