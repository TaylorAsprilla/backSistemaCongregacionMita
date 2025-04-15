require("dotenv").config();

const config: any = {
  development: {
    database: {
      username: process.env.DB_USERNAME_DEV,
      password: process.env.DB_PASSWORD_DEV,
      database: process.env.DB_DATABASE_DEV,
      host: process.env.DB_HOST_DEV,
      dialect: process.env.DB_DIALECT || "mysql",
      sinCongregacion: process.env.SIN_CONGREGACION || 1,
      sinCampo: process.env.SIN_CAMPO || 1,
    },
    email: {
      host: process.env.HOST_EMAIL_DEVELOPMENT,
      port: process.env.PORT_EMAIL_DEVELOPMENT,
      email: process.env.USER_EMAIL_DEVELOPMENT,
      password: process.env.PASS_EMAIL_DEVELOPMENT,
      from: process.env.FROM_EMAIL_DEVELOPMENT,
      service: process.env.SERVICE_EMAIL_DEVELOPMENT,
    },
    urlDeValidacion: "http://localhost:4200/#/validaremail",
    verificarLink: "http://localhost:4200/#/nueva-contrasena/",
    imagenEmail:
      "https://cmar.live/sistemacmi/assets/images/escudo-congregacion-mita.png",
    urlCmarLive: "https://cmar.live/",
    jwtSecretReset: process.env.JWT_SECRET_RESET,
    ipApi: process.env.IP_API,
    ip: "92.214.55.43",
    loginPorQr:
      process.env.LOGIN_POR_QR_DEV || "http://localhost:4200/#/login?ticket=",
    whiteList: ["http://localhost:4200", "http://localhost:56046"],
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
      host: process.env.HOST_EMAIL_PRODUCTION,
      port: process.env.PORT_EMAIL_PRODUCTION,
      email: process.env.USER_EMAIL_PRODUCTION,
      password: process.env.PASS_EMAIL_PRODUCTION,
      from: process.env.FROM_EMAIL_PRODUCTION,
      service: process.env.SERVICE_EMAIL_PRODUCTION,
    },
    urlDeValidacion: "https://qa.cmar.live/#/validaremail",
    verificarLink: "https://qa.cmar.live/#/nueva-contrasena/",
    imagenEmail:
      "https://cmar.live/sistemacmi/assets/images/escudo-congregacion-mita.png",
    urlCmarLive: "https://cmar.live/",
    jwtSecretReset: process.env.JWT_SECRET_RESET,
    ipApi: process.env.IP_API,
    loginPorQr: process.env.LOGIN_POR_QR_QA,
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
      username: process.env.DB_USERNAME_PROD,
      password: process.env.DB_PASSWORD_PROD,
      database: process.env.DB_DATABASE_PROD,
      host: process.env.DB_HOST_PROD,
      dialect: process.env.DB_DIALECT,
      sinCongregacion: process.env.SIN_CONGREGACION,
      sinCampo: process.env.SIN_CAMPO,
    },
    email: {
      host: process.env.HOST_EMAIL_PRODUCTION,
      port: process.env.PORT_EMAIL_PRODUCTION,
      email: process.env.USER_EMAIL_PRODUCTION,
      password: process.env.PASS_EMAIL_PRODUCTION,
      from: process.env.FROM_EMAIL_PRODUCTION,
      service: process.env.SERVICE_EMAIL_PRODUCTION,
    },
    urlDeValidacion: "https://cmar.live/sistemacmi/#/validaremail",
    verificarLink: "https://cmar.live/sistemacmi/#/nueva-contrasena/",
    imagenEmail:
      "https://cmar.live/sistemacmi/assets/images/escudo-congregacion-mita.png",
    urlCmarLive: "https://cmar.live/",
    jwtSecretReset: process.env.JWT_SECRET_RESET,
    ipApi: process.env.IP_API,
    loginPorQr: process.env.LOGIN_POR_QR_PROD,
    whiteList: [
      "http://localhost:4200",
      "https://cmar.live",
      "http://cmar.live",
      "http://www.cmar.live",
      "https://www.cmar.live",
    ],
  },
};

export default config;
