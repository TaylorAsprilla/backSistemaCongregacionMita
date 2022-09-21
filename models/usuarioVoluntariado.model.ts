import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioVoluntariado = db.define(
  "UsuarioVoluntariado",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    voluntariado_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioVoluntariado",
  }
);

export default UsuarioVoluntariado;
