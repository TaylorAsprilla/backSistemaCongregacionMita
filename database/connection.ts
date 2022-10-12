import { Sequelize } from "sequelize";
import config from "../config/config";

const environment = config["development"];

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
