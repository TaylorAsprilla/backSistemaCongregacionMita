require("dotenv").config();

const config = {
  sinCongregacion: process.env.SIN_CONGREGACION || 9,
  sinCampo: process.env.SIN_CAMPO || 14,
  development: {
    database: {
      username: process.env.DB_USERNAME || "u434635530_tasprilla",
      password: process.env.DB_PASSWORD || "0GgQuZy^F9v",
      database: process.env.DB_DATABASE || "u434635530_informesCMI",
      host: process.env.DB_HOST || "212.1.211.203",
      dialect: process.env.DB_DIALECT || "mysql",
    },
  },
  production: {
    database: {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
    },
  },
};

export default config;
