import { DataTypes } from "sequelize";
import db from "../database/connection";

const LinkEvento = db.define(
  "LinkEvento",
  {
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATE,
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
