import { Sequelize } from "sequelize";

const db = new Sequelize(
  "kromatest_informesCMI",
  "kromatest_tasprilla",
  "0GgQuZy^F9v",
  {
    host: "162.213.210.29",
    dialect: "mysql",
    // logging: false,
  }
);

export default db;
