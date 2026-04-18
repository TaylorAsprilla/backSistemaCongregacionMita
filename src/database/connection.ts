import { Sequelize } from "sequelize";
import config from "../config/config";
import logger from "../helpers/logger";
require("dotenv").config();

const environment = config[process.env.NODE_ENV || "development"];
const isProd = process.env.NODE_ENV === "production";

const db = new Sequelize(
  environment.database.database,
  environment.database.username,
  environment.database.password,
  {
    host: environment.database.host,
    dialect: "mysql",
    // Usar logger en lugar de console.log
    logging:
      process.env.NODE_ENV === "development"
        ? (msg) => logger.debug(msg)
        : false,
    pool: {
      // Pool optimizado para 1000 usuarios concurrentes
      // Producción: más conexiones, Desarrollo: menos recursos
      max: isProd ? 25 : 10, // Máximo de conexiones simultáneas
      min: isProd ? 5 : 2, // Mínimo de conexiones mantenidas
      acquire: 30000, // 30s timeout para adquirir conexión
      idle: 10000, // 10s antes de liberar conexión inactiva
      evict: 10000, // Revisar cada 10s para eliminar conexiones idle
    },
    dialectOptions: {
      // Configuraciones adicionales para producción
      ...(isProd && {
        connectTimeout: 60000, // 60s timeout de conexión
      }),
    },
  },
);

export default db;
