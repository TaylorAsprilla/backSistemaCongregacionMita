import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioMinisterio = db.define(
  "UsuarioMinisterio",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    ministerio_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    tableName: "usuarioMinisterio",
  }
);

export default UsuarioMinisterio;
