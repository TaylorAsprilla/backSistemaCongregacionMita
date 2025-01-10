import { SOLICITUD_MULTIMEDIA_ENUM } from "./../enum/solicitudMultimendia.enum";
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
      type: DataTypes.ENUM(
        SOLICITUD_MULTIMEDIA_ENUM.PENDIENTE,
        SOLICITUD_MULTIMEDIA_ENUM.DENEGADA,
        SOLICITUD_MULTIMEDIA_ENUM.APROBADA,
        SOLICITUD_MULTIMEDIA_ENUM.ELIMINADA,
        SOLICITUD_MULTIMEDIA_ENUM.CADUCADA,
        SOLICITUD_MULTIMEDIA_ENUM.EMAIL_NO_VERIFICADO
      ),
      defaultValue: SOLICITUD_MULTIMEDIA_ENUM.PENDIENTE,
      allowNull: false,
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
    usuarioQueAprobo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
