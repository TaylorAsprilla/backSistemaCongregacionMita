import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioFuenteIngreso = db.define(
  "UsuarioFuenteIngreso",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    fuenteIngreso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    tableName: "usuarioFuenteIngreso",
  }
);

export default UsuarioFuenteIngreso;
