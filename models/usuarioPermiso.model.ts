import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioPermiso = db.define(
  "UsuarioPermiso",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    permiso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioPermiso",
  }
);

export default UsuarioPermiso;
