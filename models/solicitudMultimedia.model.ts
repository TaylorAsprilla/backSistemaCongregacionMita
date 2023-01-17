import { DataTypes } from "sequelize";
import db from "../database/connection";

const SolicitudMultimedia = db.define(
  "solicitudMultimedia",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departamento: {
      type: DataTypes.STRING,
    },
    codigoPostal: {
      type: DataTypes.STRING,
    },
    pais: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING,
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    miembroCongregacion: {
      type: DataTypes.BOOLEAN,
    },
    congregacionCercana: {
      type: DataTypes.STRING,
    },
    otraRazon: {
      type: DataTypes.STRING,
    },
    tiempoDistancia: {
      type: DataTypes.STRING,
    },
    horaTemploMasCercano: {
      type: DataTypes.STRING,
    },
    personaEncamada: {
      type: DataTypes.BOOLEAN,
    },
    personaEncargada: {
      type: DataTypes.STRING,
    },
    celularPersonaEncargada: {
      type: DataTypes.STRING,
    },
    enfermedadCronica: {
      type: DataTypes.BOOLEAN,
    },
    enfermedadQuePadece: {
      type: DataTypes.STRING,
    },
    paisDondeEstudia: {
      type: DataTypes.STRING,
    },
    ciudadDondeEstudia: {
      type: DataTypes.STRING,
    },
    duracionDelPeriodoDeEstudio: {
      type: DataTypes.DATE,
    },
    baseMilitar: {
      type: DataTypes.STRING,
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    motivoDeNegacion: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    emailVerificado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    razonSolicitud_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nacionalidad_id: {
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
    terminos: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    freezeTableName: true,
    tableName: "solicitudMultimedia",
  }
);

export default SolicitudMultimedia;
