import { DataTypes } from "sequelize";
import db from "../database/connection";

const SolicitudMultimedia = db.define(
  "solicitudMultimedia",
  {
    otraRazon: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    tiempoDistancia: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    horaTemploMasCercano: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    personaEncamada: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    personaEncargada: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    celularPersonaEncargada: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    enfermedadCronica: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    enfermedadQuePadece: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    paisDondeEstudia: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    ciudadDondeEstudia: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    duracionDelPeriodoDeEstudio: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    baseMilitar: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    observaciones: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    motivoDeNegacion: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    emailVerificado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    },
    tipoDeEstudio_id: {
      type: DataTypes.INTEGER,
    },
    parentesco_id: {
      type: DataTypes.INTEGER,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
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
    },
  },
  {
    freezeTableName: true,
    tableName: "solicitudMultimedia",
  }
);

export default SolicitudMultimedia;
