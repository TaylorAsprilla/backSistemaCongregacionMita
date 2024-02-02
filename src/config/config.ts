require("dotenv").config();

const config: any = {
  development: {
    database: {
      username: process.env.DB_USERNAME_DEV,
      password: process.env.DB_PASSWORD_DEV,
      database: process.env.DB_DATABASE_DEV,
      host: process.env.DB_HOST_DEV,
      dialect: process.env.DB_DIALECT,
      sinCongregacion: process.env.SIN_CONGREGACION || 1,
      sinCampo: process.env.SIN_CAMPO || 1,
    },
    email: {
      email: process.env.EMAIL,
      password: process.env.EMAIL_PASSWORD,
    },
    urlDeValidacion: "http://localhost:4200/#/validaremail",
    verificarLink: "http://localhost:4200/#/nueva-contrasena/",
    imagenEmail:
      "https://cmar.live/sistemacmi/assets/images/cmar-multimedia.png",
    urlCmarLive: "https://cmar.live/",
    jwtSecretReset: process.env.JWT_SECRET_RESET,
    ipApi: process.env.IP_API,
    ip: "92.214.55.43",
    whiteList: ["http://localhost:4200"],
  },
  sit: {
    database: {
      username: process.env.DB_USERNAME || "u434635530_tasprilla",
      password: process.env.DB_PASSWORD || "0GgQuZy^F9v",
      database: process.env.DB_DATABASE || "u434635530_informesCMI",
      host: process.env.DB_HOST || "212.1.211.203",
      dialect: process.env.DB_DIALECT || "mysql",
      sinCongregacion: process.env.SIN_CONGREGACION || 1,
      sinCampo: process.env.SIN_CAMPO || 1,
    },
    email: {
      email: process.env.EMAIL,
      password: process.env.EMAIL_PASSWORD,
    },
    urlDeValidacion: "http://localhost:4200/#/validaremail",
    verificarLink: "http://localhost:4200/#/nueva-contrasena/",
    imagenEmail:
      "https://cmar.live/sistemacmi/assets/images/cmar-multimedia.png",
    urlCmarLive: "https://cmar.live/",
    jwtSecretReset: process.env.JWT_SECRET_RESET,
    ipApi: process.env.IP_API,
    ip: "92.214.55.43",
    whiteList: ["http://localhost:4200"],
  },
  qa: {
    database: {
      username: process.env.DB_USERNAME_QA,
      password: process.env.DB_PASSWORD_QA,
      database: process.env.DB_DATABASE_QA,
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
      sinCongregacion: process.env.SIN_CONGREGACION,
      sinCampo: process.env.SIN_CAMPO,
    },
    email: {
      email: process.env.EMAIL,
      password: process.env.EMAIL_PASSWORD,
    },
    urlDeValidacion: "https://qa.cmar.live/#/validaremail",
    verificarLink: "https://qa.cmar.live/#/nueva-contrasena/",
    imagenEmail:
      "https://cmar.live/sistemacmi/assets/images/cmar-multimedia.png",
    urlCmarLive: "https://cmar.live/",
    jwtSecretReset: process.env.JWT_SECRET_RESET,
    ipApi: process.env.IP_API,
    whiteList: [
      "http://localhost:4200",
      "https://qa.cmar.live",
      "http://qa.cmar.live",
      "https://cmar.live",
      "http://cmar.live",
    ],
  },
  production: {
    database: {
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
      sinCongregacion: process.env.SIN_CONGREGACION,
      sinCampo: process.env.SIN_CAMPO,
    },
    email: {
      email: process.env.EMAIL,
      password: process.env.EMAIL_PASSWORD,
    },
    urlDeValidacion: "https://cmar.live/sistemacmi/#/validaremail",
    verificarLink: "https://cmar.live/sistemacmi/#/nueva-contrasena/",
    imagenEmail:
      "https://cmar.live/sistemacmi/assets/images/cmar-multimedia.png",
    urlCmarLive: "https://cmar.live/",
    jwtSecretReset: process.env.JWT_SECRET_RESET,
    ipApi: process.env.IP_API,
    whiteList: [
      "https://cmar.live",
      "http://cmar.live",
      "http://www.cmar.live",
      "https://www.cmar.live",
    ],
  },
};

export default config;
