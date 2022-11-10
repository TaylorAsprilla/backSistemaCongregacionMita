import express, { Application } from "express";
import usuarioRoutes from "../routes/usuario.routes";
import loginRoutes from "../routes/login.routes";
import generoRoutes from "../routes/genero.routes";
import busquedasRoutes from "../routes/busqueda.routes";
import tipoDocumentoRoutes from "../routes/tipoDocumento.routes";
import tipoUsuarioRoutes from "../routes/tipoUsuario.routes";
import ministerioRoutes from "../routes/ministerio.routes";
import permisoRoutes from "../routes/permiso.routes";
import tipoActividadRoutes from "../routes/tipoActividad.routes";
import actividadRoutes from "../routes/actividad.routes";
import informeRoutes from "../routes/informe.routes";
import contabilidadRoutes from "../routes/contabilidad.routes";
import logroRoutes from "../routes/logro.routes";
import asuntoPendienteRoutes from "../routes/asuntoPendiente.routes";
import tipoStatusRoutes from "../routes/tipoStatus.routes";
import metaRoutes from "../routes/meta.routes";
import visitaRoutes from "../routes/visita.routes";
import paisRoutes from "../routes/pais.routes";
import divisaRoutes from "../routes/divisa.routes";
import congregacionRoutes from "../routes/congregacion.routes";
import campoRoutes from "../routes/campo.routes";
import estadoCivilRoutes from "../routes/estadoCivil.routes";
import rolCasaRoutes from "../routes/rolCasa.routes";
import vacunaRoutes from "../routes/vacuna.routes";
import dosisRoutes from "../routes/dosis.routes";
import situacionVisitaRoutes from "../routes/situacionVisita.routes";
import seccionInformeRoutes from "../routes/seccionInforme.routes";
import nacionalidadRoutes from "../routes/nacionalidad.routes";
import direccionRoutes from "../routes/direccion.routes";
import tipoDireccionRoutes from "../routes/tipoDireccion.routes";
import fuenteIngresoRoutes from "../routes/fuenteIngreso.routes";
import gradoAcademicoRoutes from "../routes/gradoAcademico.routes";
import tipoEmpleoRoutes from "../routes/tipoEmpleo.routes";
import tipoMiembroRoutes from "../routes/tipoMiembro.routes";
import accesoMultimediaRoutes from "../routes/solicitudMultimedia.routes";
import voluntariadoRoutes from "../routes/voluntariado.routes";
import buscarCorreoRoutes from "../routes/buscarCorreo.routes";
import buscarCelularRoutes from "../routes/buscarCelular.routes";
import razonSolicitudRoutes from "../routes/razonSolicitud.routes";
import parentescoRoutes from "../routes/parentesco.routes";
import linkEventosRoutes from "../routes/linkEventos.routes";
import obreroRoutes from "../routes/obrero.routes";
import homeRoutes from "../routes/home.routes";
import cors from "cors";
import db from "../database/connection";
require("../database/associations");

class Server {
  private app: Application;
  private port: string;
  private apiPaths = {
    home: "/api/",
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
    vacuna: "/api/vacuna",
    dosis: "/api/dosis",
    situacionVisita: "/api/situacionvisita",
    seccionInforme: "/api/seccioninforme",
    nacionalidad: "/api/nacionalidad",
    direccion: "/api/direccion",
    tipoDireccion: "/api/tipodireccion",
    fuenteIngreso: "/api/fuenteIngreso",
    gradoAcademico: "/api/gradoAcademico",
    tipoEmpleo: "/api/tipoempleo",
    tipoMiembro: "/api/tipomiembro",
    solicitud: "/api/solicitud",
    voluntariado: "/api/voluntariado",
    buscarCorreo: "/api/buscarcorreo",
    buscarCelular: "/api/buscarcelular",
    razonSolicitud: "/api/razonsolicitud",
    parentesco: "/api/parentesco",
    evento: "/api/evento",
    obrero: "/api/obrero",
  };

  constructor() {
    this.app = express();
    this.port = process.env.PORT || "4000";
    this.app.get("/", (req, res) => {
      res.status(200);
      res.send({ data: "OK!!!" });
    });

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
      console.log(error);
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
    this.app.use(this.apiPaths.home, homeRoutes);
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
    this.app.use(this.apiPaths.vacuna, vacunaRoutes);
    this.app.use(this.apiPaths.dosis, dosisRoutes);
    this.app.use(this.apiPaths.situacionVisita, situacionVisitaRoutes);
    this.app.use(this.apiPaths.seccionInforme, seccionInformeRoutes);
    this.app.use(this.apiPaths.nacionalidad, nacionalidadRoutes);
    this.app.use(this.apiPaths.direccion, direccionRoutes);
    this.app.use(this.apiPaths.tipoDireccion, tipoDireccionRoutes);
    this.app.use(this.apiPaths.fuenteIngreso, fuenteIngresoRoutes);
    this.app.use(this.apiPaths.gradoAcademico, gradoAcademicoRoutes);
    this.app.use(this.apiPaths.tipoEmpleo, tipoEmpleoRoutes);
    this.app.use(this.apiPaths.tipoMiembro, tipoMiembroRoutes);
    this.app.use(this.apiPaths.solicitud, accesoMultimediaRoutes);
    this.app.use(this.apiPaths.voluntariado, voluntariadoRoutes);
    this.app.use(this.apiPaths.buscarCorreo, buscarCorreoRoutes);
    this.app.use(this.apiPaths.buscarCelular, buscarCelularRoutes);
    this.app.use(this.apiPaths.razonSolicitud, razonSolicitudRoutes);
    this.app.use(this.apiPaths.parentesco, parentescoRoutes);
    this.app.use(this.apiPaths.evento, linkEventosRoutes);
    this.app.use(this.apiPaths.obrero, obreroRoutes);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Servidor corriendo en puerto ${this.port}`);
    });
  }
}

export default Server;
