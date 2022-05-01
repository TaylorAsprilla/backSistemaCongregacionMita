import { Sequelize } from "sequelize";

const db = new Sequelize(
  "u434635530_informesCMI",
  "u434635530_tasprilla",
  "0GgQuZy^F9v",
  {
    host: "212.1.211.203",
    dialect: "mysql",
    // logging: false,
  }
);

export default db;
