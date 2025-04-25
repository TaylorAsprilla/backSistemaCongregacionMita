import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioGrupoGemelos = db.define("UsuarioGrupoGemelos", {
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  grupoGemelos_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

export default UsuarioGrupoGemelos;
