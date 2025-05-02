import "./crons/notifyExpiration";

import express, { Application } from "express";
import usuarioRoutes from "./routes/usuario.routes";
import loginRoutes from "./routes/login.routes";
import generoRoutes from "./routes/genero.routes";
import busquedasRoutes from "./routes/busqueda.routes";
import tipoDocumentoRoutes from "./routes/tipoDocumento.routes";
import tipoUsuarioRoutes from "./routes/tipoUsuario.routes";
import ministerioRoutes from "./routes/ministerio.routes";
import permisoRoutes from "./routes/permiso.routes";
import tipoActividadRoutes from "./routes/tipoActividad.routes";
import actividadRoutes from "./routes/actividad.routes";
import informeRoutes from "./routes/informe.routes";
import contabilidadRoutes from "./routes/contabilidad.routes";
import logroRoutes from "./routes/logro.routes";
import asuntoPendienteRoutes from "./routes/asuntoPendiente.routes";
import tipoStatusRoutes from "./routes/tipoStatus.routes";
import metaRoutes from "./routes/meta.routes";
import visitaRoutes from "./routes/visita.routes";
import paisRoutes from "./routes/pais.routes";
import divisaRoutes from "./routes/divisa.routes";
import congregacionRoutes from "./routes/congregacion.routes";
import campoRoutes from "./routes/campo.routes";
import estadoCivilRoutes from "./routes/estadoCivil.routes";
import rolCasaRoutes from "./routes/rolCasa.routes";
import situacionVisitaRoutes from "./routes/situacionVisita.routes";
import seccionInformeRoutes from "./routes/seccionInforme.routes";
import nacionalidadRoutes from "./routes/nacionalidad.routes";
import gradoAcademicoRoutes from "./routes/gradoAcademico.routes";
import tipoMiembroRoutes from "./routes/tipoMiembro.routes";
import solicitudMultimediaRoutes from "./routes/solicitudMultimedia.routes";
import voluntariadoRoutes from "./routes/voluntariado.routes";
import buscarCorreoRoutes from "./routes/buscarCorreo.routes";
import razonSolicitudRoutes from "./routes/razonSolicitud.routes";
import linkEventosRoutes from "./routes/linkEventos.routes";
import obreroRoutes from "./routes/obrero.routes";
import accesoMultimediaRoutes from "./routes/accesoMultimedia.routes";
import supervisorCongregacionRoutes from "./routes/supervisorCongregacion.routes";
import tipoEstudioRoutes from "./routes/tipoEstudio.routes";
import opcionTransporteRoutes from "./routes/opcionTransporte.routes";
import parentescoRoutes from "./routes/parentesco.routes";
import usuarioCongregacionRoutes from "./routes/usuarioCongregacion.routes";
import ayudanteRoutes from "./routes/ayudante.routes";
import emailRoutes from "./routes/email.routes";
import accesoQrRoutes from "./routes/accesoQR.routes";
import grupoGemelosRoutes from "./routes/grupoGemelos.routes";

import cors from "cors";
import db from "./database/connection";
import config from "./config/config";

require("./database/associations");

const environment = config[process.env.NODE_ENV || "development"];
const whiteList = environment.whiteList;

class Server {
  private app: Application;
  private port: string;
  private apiPaths = {
    home: "/",
    usuarios: "/api/usuarios",
    login: "/api/login",
    busquedas: "/api/busquedas",
    tipoDocumento: "/api/tipodocumento",
    genero: "/api/genero",
    tipoUsuario: "/api/tipoUsuario",
    ministerio: "/api/ministerio",
    permiso: "/api/permiso",
    tipoActividad: "/api/tipoactividad",
    actividad: "/api/actividad",
    informe: "/api/informe",
    contabilidad: "/api/contabilidad",
    logro: "/api/logro",
    asuntoPendiente: "/api/asuntopendiente",
    tipoStatus: "/api/tipostatus",
    meta: "/api/meta",
    visita: "/api/visita",
    pais: "/api/pais",
    divisa: "/api/divisa",
    congregacion: "/api/congregacion",
    campo: "/api/campo",
    estadoCivil: "/api/estadocivil",
    rolcasa: "/api/rolcasa",
    situacionVisita: "/api/situacionvisita",
    seccionInforme: "/api/seccioninforme",
    nacionalidad: "/api/nacionalidad",
    direccion: "/api/direccion",
    tipoDireccion: "/api/tipodireccion",
    gradoAcademico: "/api/gradoAcademico",
    tipoMiembro: "/api/tipomiembro",
    solicitudmultimedia: "/api/solicitudmultimedia",
    voluntariado: "/api/voluntariado",
    buscarCorreo: "/api/buscarcorreo",
    buscarCelular: "/api/buscarcelular",
    razonSolicitud: "/api/razonsolicitud",
    parentesco: "/api/parentesco",
    evento: "/api/evento",
    obrero: "/api/obrero",
    accesoMultimedia: "/api/accesomultimedia",
    supervisorCongregacion: "/api/supervisorcongregacion",
    tipoEstudio: "/api/tipoestudio",
    opcionTransporte: "/api/opciontransporte",
    password: "/api/password",
    usuarioCongregacion: "/api/usuariocongregacion",
    ayudante: "/api/ayudante",
    email: "/api/email",
    accesoQr: "/api/accesoqr",
    grupoGemelos: "/api/grupogemelos",
  };

  constructor() {
    this.app = express();

    // Habilitar trust proxy para manejar direcciones IP detrás de un proxy
    this.app.set("trust proxy", true);
    this.port = process.env.PORT || "4000";

    // Métodos Iniciales
    this.dbConnection();
    this.midedlewares();
    // Definir mis rutas
    this.routes();
  }

  async dbConnection() {
    try {
      await db.authenticate();
      console.info("Database Online");
    } catch (error) {
      console.error(error);
    }
  }

  midedlewares() {
    // CORS
    this.app.use(cors({ origin: whiteList }));

    // Lectura del body
    this.app.use(express.json());

    // Carpeta pública
    // this.app.use(express.static("public")); //TODO Carpeta pública

    this.app.get("/", (req, res, next) =>
      res.status(200).json({ msg: "CMAR LIVE - Congregación Mita INC 2025" })
    );
  }

  routes() {
    // this.app.use(this.apiPaths.home, homeRoutes);
    this.app.use(this.apiPaths.usuarios, usuarioRoutes);
    this.app.use(this.apiPaths.login, loginRoutes);
    this.app.use(this.apiPaths.busquedas, busquedasRoutes);
    this.app.use(this.apiPaths.tipoDocumento, tipoDocumentoRoutes);
    this.app.use(this.apiPaths.genero, generoRoutes);
    this.app.use(this.apiPaths.tipoUsuario, tipoUsuarioRoutes);
    this.app.use(this.apiPaths.ministerio, ministerioRoutes);
    this.app.use(this.apiPaths.permiso, permisoRoutes);
    this.app.use(this.apiPaths.tipoActividad, tipoActividadRoutes);
    this.app.use(this.apiPaths.actividad, actividadRoutes);
    this.app.use(this.apiPaths.informe, informeRoutes);
    this.app.use(this.apiPaths.contabilidad, contabilidadRoutes);
    this.app.use(this.apiPaths.logro, logroRoutes);
    this.app.use(this.apiPaths.asuntoPendiente, asuntoPendienteRoutes);
    this.app.use(this.apiPaths.tipoStatus, tipoStatusRoutes);
    this.app.use(this.apiPaths.meta, metaRoutes);
    this.app.use(this.apiPaths.visita, visitaRoutes);
    this.app.use(this.apiPaths.pais, paisRoutes);
    this.app.use(this.apiPaths.divisa, divisaRoutes);
    this.app.use(this.apiPaths.congregacion, congregacionRoutes);
    this.app.use(this.apiPaths.campo, campoRoutes);
    this.app.use(this.apiPaths.estadoCivil, estadoCivilRoutes);
    this.app.use(this.apiPaths.rolcasa, rolCasaRoutes);
    this.app.use(this.apiPaths.situacionVisita, situacionVisitaRoutes);
    this.app.use(this.apiPaths.seccionInforme, seccionInformeRoutes);
    this.app.use(this.apiPaths.nacionalidad, nacionalidadRoutes);
    this.app.use(this.apiPaths.gradoAcademico, gradoAcademicoRoutes);
    this.app.use(this.apiPaths.tipoMiembro, tipoMiembroRoutes);
    this.app.use(this.apiPaths.solicitudmultimedia, solicitudMultimediaRoutes);
    this.app.use(this.apiPaths.voluntariado, voluntariadoRoutes);
    this.app.use(this.apiPaths.buscarCorreo, buscarCorreoRoutes);
    this.app.use(this.apiPaths.razonSolicitud, razonSolicitudRoutes);
    this.app.use(this.apiPaths.evento, linkEventosRoutes);
    this.app.use(this.apiPaths.obrero, obreroRoutes);
    this.app.use(this.apiPaths.accesoMultimedia, accesoMultimediaRoutes);
    this.app.use(
      this.apiPaths.supervisorCongregacion,
      supervisorCongregacionRoutes
    );
    this.app.use(this.apiPaths.tipoEstudio, tipoEstudioRoutes);
    this.app.use(this.apiPaths.opcionTransporte, opcionTransporteRoutes);
    this.app.use(this.apiPaths.parentesco, parentescoRoutes);
    this.app.use(this.apiPaths.usuarioCongregacion, usuarioCongregacionRoutes);
    this.app.use(this.apiPaths.ayudante, ayudanteRoutes);
    this.app.use(this.apiPaths.email, emailRoutes);
    this.app.use(this.apiPaths.accesoQr, accesoQrRoutes);
    this.app.use(this.apiPaths.grupoGemelos, grupoGemelosRoutes);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.info(`Servidor corriendo en puerto ${this.port}`);
    });
  }
}

export default Server;
