import { DataTypes } from "sequelize";
import db from "../database/connection";

const UsuarioDireccion = db.define(
  "UsuarioDireccion",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    direccion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuarioDireccion",
  }
);

export default UsuarioDireccion;
