import { DataTypes } from "sequelize";
import db from "../database/connection";
import { TIPO_MENSAJE_INFORMATIVO_ENUM } from "../enum/mensajeInformativo.enum";

const MensajeInformativo = db.define(
  "MensajeInformativo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titulo: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tipo: {
      type: DataTypes.ENUM(...Object.values(TIPO_MENSAJE_INFORMATIVO_ENUM)),
      allowNull: false,
      defaultValue: TIPO_MENSAJE_INFORMATIVO_ENUM.INFO,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    publicar_desde: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    publicar_hasta: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    prioridad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actualizado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "mensajes_informativos",
  },
);

export default MensajeInformativo;
