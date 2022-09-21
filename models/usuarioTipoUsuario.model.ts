import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioTipoUsuario = db.define(
  "UsuarioTipoUsuario",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipoUsuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioTipoUsuario",
  }
);

export default UsuarioTipoUsuario;
