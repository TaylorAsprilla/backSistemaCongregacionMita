import { DataTypes } from "sequelize";
import db from "../database/connection";

const InformeResponsable = db.define(
  "InformeResponsable",
  {
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    nombre_responsable: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipo_responsabilidad: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "informeResponsable",
  },
);

export default InformeResponsable;
