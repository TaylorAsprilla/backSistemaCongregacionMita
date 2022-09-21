import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioFuenteIngreso = db.define(
  "UsuarioFuenteIngreso",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fuenteIngreso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioFuenteIngreso",
  }
);

export default UsuarioFuenteIngreso;
