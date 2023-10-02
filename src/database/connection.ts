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
    // logging: false,
  }
);

export default db;
