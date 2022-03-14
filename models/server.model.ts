import express, { Application } from "express";
import usuarioRoutes from "../routes/usuario.routes";
import loginRoutes from "../routes/login.routes";
import cors from "cors";
import db from "../database/connection";

class Server {
  private app: Application;
  private port: string;
  private apiPaths = {
    usuarios: "/api/usuarios",
    login: "/api/login",
  };

  constructor() {
    this.app = express();
    this.port = process.env.PORT || "8000";

    // Métodos Iniciales
    this.dbConnection();
    this.midedlewares();
    // Definir mis rutas
    this.routes();
  }

  async dbConnection() {
    try {
      await db.authenticate();
      console.log("Database Online");
    } catch (error) {
      throw console.log(error);
    }
  }

  midedlewares() {
    // CORS
    this.app.use(cors());

    // Lectura del body
    this.app.use(express.json());

    // Carpeta pública
    this.app.use(express.static("public"));
  }

  routes() {
    this.app.use(this.apiPaths.usuarios, usuarioRoutes);
    this.app.use(this.apiPaths.login, loginRoutes);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log("Servidor corriendo en puerto " + this.port);
    });
  }
}

export default Server;
