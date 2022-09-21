import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioMinisterio = db.define(
  "UsuarioMinisterio",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ministerio_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioMinisterio",
  }
);

export default UsuarioMinisterio;
