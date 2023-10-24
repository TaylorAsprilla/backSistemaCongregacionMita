import { DataTypes } from "sequelize";
import db from "../database/connection";

const UbicacionConexion = db.define(
  "UbicacionConexion",
  {
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    continente: {
      type: DataTypes.STRING,
    },
    continenteCode: {
      type: DataTypes.STRING,
    },
    pais: {
      type: DataTypes.STRING,
    },
    paisCode: {
      type: DataTypes.STRING,
    },
    region: {
      type: DataTypes.STRING,
    },
    regionName: {
      type: DataTypes.STRING,
    },
    ciudad: {
      type: DataTypes.STRING,
    },
    distrito: {
      type: DataTypes.STRING,
    },
    zip: {
      type: DataTypes.STRING,
    },
    longitud: {
      type: DataTypes.STRING,
    },

    latitud: {
      type: DataTypes.STRING,
    },

    timeZone: {
      type: DataTypes.STRING,
    },
    operador: {
      type: DataTypes.STRING,
    },
    currency: {
      type: DataTypes.STRING,
    },
    userAgent: {
      type: DataTypes.STRING,
    },
    navegador: {
      type: DataTypes.STRING,
    },
    tipoDispositivo: {
      type: DataTypes.STRING,
    },
    dispositivo: {
      type: DataTypes.STRING,
    },
    marca: {
      type: DataTypes.STRING,
    },
    modelo: {
      type: DataTypes.STRING,
    },
    so: {
      type: DataTypes.STRING,
    },
    version: {
      type: DataTypes.STRING,
    },
    plataforma: {
      type: DataTypes.STRING,
    },
    motorNavegador: {
      type: DataTypes.STRING,
    },
    idUsuario: {
      type: DataTypes.INTEGER,
      references: {
        model: "Usuario",
        key: "id",
      },
    },
  },
  {
    freezeTableName: true,
    tableName: "ubicacionConexion",
  }
);

export default UbicacionConexion;
