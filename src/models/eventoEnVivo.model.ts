import { DataTypes } from "sequelize";
import db from "../database/connection";
import { PLATAFORMA } from "../enum/plataforma.enum";

const EventoEnVivo = db.define(
  "EventoEnVivo",
  {
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    linkTransmision: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    plataforma: {
      type: DataTypes.STRING,
      allowNull: false,
      values: [PLATAFORMA.YOUTUBE, PLATAFORMA.VIMEO],
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    tipoEvento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Usuario que creó el evento",
    },
  },
  {
    freezeTableName: true,
    tableName: "eventoEnVivo",
  },
);

export default EventoEnVivo;
