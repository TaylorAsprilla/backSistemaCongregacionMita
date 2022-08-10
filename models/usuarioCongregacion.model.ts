import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioCongregacion = db.define(
  "UsuarioCongregacion",
  {
    usuario_id: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    pais_id: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    congregacion_id: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    campo_id: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioCongregacion",
  }
);

export default UsuarioCongregacion;
