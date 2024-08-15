import { Sequelize } from "sequelize";
import config from "../config/config";
require("dotenv").config();

const environment = config[process.env.NODE_ENV || "development"];

const db = new Sequelize(
  environment.database.database,
  environment.database.username,
  environment.database.password,
  {
    host: environment.database.host,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 200, // Número máximo de conexiones en el pool
      min: 50, // Número mínimo de conexiones en el pool
      acquire: 60000, // Tiempo máximo de espera para adquirir una conexión antes de lanzar un error (ms)
      idle: 10000, // Tiempo máximo que una conexión puede estar inactiva antes de ser liberada (ms)
    },
  }
);

export default db;
