import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioCongregacion = db.define(
  "UsuarioCongregacion",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pais_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    congregacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    campo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioCongregacion",
  }
);

export default UsuarioCongregacion;
