import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioGrupoGemelos = db.define(
  "UsuarioGrupoGemelos",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "usuario",
        key: "id",
      },
    },
    grupoGemelos_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "grupoGemelos",
        key: "id",
      },
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioGrupoGemelos",
  }
);

export default UsuarioGrupoGemelos;
