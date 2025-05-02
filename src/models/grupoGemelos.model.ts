import { DataTypes } from "sequelize";
import db from "../database/connection";
import { GRUPOGEMELOS } from "../enum/grupoGemelos.enum";

const GrupoGemelos = db.define(
  "GrupoGemelos",
  {
    tipo: {
      type: DataTypes.ENUM(
        GRUPOGEMELOS.GEMELO,
        GRUPOGEMELOS.MELLIZO,
        GRUPOGEMELOS.TRILLIZO,
        GRUPOGEMELOS.OTRO
      ),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fechaNacimientoComun: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "grupoGemelos",
  }
);

export default GrupoGemelos;
