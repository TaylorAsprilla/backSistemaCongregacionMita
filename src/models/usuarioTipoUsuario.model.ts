import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioTipoUsuario = db.define(
  "UsuarioTipoUsuario",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    tipoUsuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    tableName: "usuarioTipoUsuario",
  }
);

export default UsuarioTipoUsuario;
