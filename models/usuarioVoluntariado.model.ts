import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioVoluntariado = db.define(
  "UsuarioVoluntariado",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    voluntariado_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
    tableName: "usuarioVoluntariado",
  }
);

export default UsuarioVoluntariado;
