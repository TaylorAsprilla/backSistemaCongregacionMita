import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioDireccion = db.define(
  "UsuarioDireccion",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    direccion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    tableName: "usuarioDireccion",
  }
);

export default UsuarioDireccion;
