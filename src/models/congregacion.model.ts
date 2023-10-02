import { DataTypes } from "sequelize";
import db from "../database/connection";

const Congregacion = db.define(
  "Congregacion",
  {
    congregacion: {
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
    idObreroEncargado: {
      type: DataTypes.INTEGER,
      // allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "congregacion",
  }
);

export default Congregacion;
