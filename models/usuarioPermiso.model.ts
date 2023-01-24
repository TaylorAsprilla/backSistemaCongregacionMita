import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioPermiso = db.define(
  "UsuarioPermiso",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    permiso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioPermiso",
  }
);

export default UsuarioPermiso;
