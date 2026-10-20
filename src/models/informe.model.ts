import { DataTypes } from "sequelize";
import db from "../database/connection";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";

const Informe = db.define(
  "Informe",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipo_congregacion: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    congregacion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    nombre_unidad: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nombre_pais: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nombre_congregacion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nombre_campo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM(...Object.values(ESTADO_INFORME_ENUM)),
      allowNull: false,
      defaultValue: ESTADO_INFORME_ENUM.ABIERTO,
    },
    periodo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fecha_cierre: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usuario_cierre_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "informe",
    indexes: [
      {
        name: "uq_informe_periodo_congregacion",
        unique: true,
        fields: ["periodo", "tipo_congregacion", "congregacion_id"],
      },
    ],
  },
);

export default Informe;
