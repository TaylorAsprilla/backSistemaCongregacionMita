import { Sequelize } from "sequelize";
import config from "../config/config";
require("dotenv").config();

const environment = config[process.env.NODE_ENV || "sit"];

const db = new Sequelize(
  environment.database.database,
  environment.database.username,
  environment.database.password,
  {
    host: environment.database.host,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "sit" ? console.log : false,
  }
);

export default db;
