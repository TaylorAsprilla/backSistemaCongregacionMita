import { DataTypes } from "sequelize";
import db from "../database/connection";

const Contabilidad = db.define(
  "Contabilidad",
  {
    sobres: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transferencia: {
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
    depositoActividades: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    idSeccion: {
      type: DataTypes.INTEGER,
      // allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "contabilidad",
  }
);

export default Contabilidad;
