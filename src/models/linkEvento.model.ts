import { DataTypes } from "sequelize";
import db from "../database/connection";
import { PLATAFORMA } from "../enum/plataforma.enum";

const LinkEvento = db.define(
  "LinkEvento",
  {
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    plataforma: {
      type: DataTypes.STRING,
      allowNull: false,
      values: [
        PLATAFORMA.YOUTUBE,
        PLATAFORMA.VIMEO,
        PLATAFORMA.ANTMEDIA,
        PLATAFORMA.SWARMIFY,
      ],
      defaultValue: PLATAFORMA.SWARMIFY,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    eventoEnBiblioteca: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    tipoEvento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "linkEvento",
  },
);

export default LinkEvento;
