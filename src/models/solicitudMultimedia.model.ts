import { DataTypes } from "sequelize";
import db from "../database/connection";

const SolicitudMultimedia = db.define(
  "solicitudMultimedia",
  {
    otraRazon: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    tiempoDistancia: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    horaTemploMasCercano: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    personaEncamada: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
      allowNull: true,
    },
    personaEncargada: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    celularPersonaEncargada: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    enfermedadCronica: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
      allowNull: true,
    },
    enfermedadQuePadece: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    paisDondeEstudia: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    ciudadDondeEstudia: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    duracionDelPeriodoDeEstudio: {
      type: DataTypes.DATE,
      defaultValue: null,
      allowNull: true,
    },
    baseMilitar: {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: true,
    },
    motivoDeNegacion: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
      allowNull: true,
    },
    emailVerificado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    razonSolicitud_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    usuarioQueRegistra_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    opcionTransporte_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipoDeEstudio_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    parentesco_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    terminos: {
      type: DataTypes.BOOLEAN,
    },
    tiempoAprobacion: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    tiempoSugerido: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    congregacionCercana: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "solicitudMultimedia",
  }
);

export default SolicitudMultimedia;
