import fs from "fs";
import path from "path";
import cron from "node-cron";
import { Op } from "sequelize";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import Usuario from "../models/usuario.model";
import enviarEmail from "../helpers/email";
import config from "../config/config";
import db from "../database/connection";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

let emailTemplateNotificacion: string;
let emailAccesoCaducado: string;

// Cargar plantillas de correo una vez al inicio
const loadEmailTemplates = () => {
  const templatePathBienvenida = path.join(
    __dirname,
    "../templates/accesoCaducado.html"
  );
  const templatePathNotificacion = path.join(
    __dirname,
    "../templates/notificacionCaducidad.html"
  );

  emailAccesoCaducado = fs.readFileSync(templatePathBienvenida, "utf8");
  emailTemplateNotificacion = fs.readFileSync(templatePathNotificacion, "utf8");
};

const verificarFechasYEnviarCorreos = async () => {
  const hoy = new Date();
  const dias = [15, 8, 5, 2, 1];

  console.log("Verificando fechas y enviando correos...");

  const solicitudes = await SolicitudMultimedia.findAll({
    where: {
      estado: true,
      emailVerificado: true,
    },
    include: [{ model: Usuario, as: "usuario" }],
  });

  for (const solicitud of solicitudes) {
    const tiempoAprobacion = solicitud.getDataValue("tiempoAprobacion");
    const diferenciaDias = Math.ceil(
      (new Date(tiempoAprobacion).getTime() - hoy.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (dias.includes(diferenciaDias)) {
      const usuario = solicitud.getDataValue("usuario");

      if (usuario) {
        const nombre = `${usuario.primerNombre} ${usuario.segundoNombre} ${usuario.primerApellido} ${usuario.segundoApellido}`;

        const fechaCaducidad = tiempoAprobacion;

        const personalizarEmail = emailTemplateNotificacion
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombre}}", nombre)
          .replace("{{dias}}", diferenciaDias.toString())
          .replace("{{fechaCaducidad}}", fechaCaducidad);

        console.log(
          `Enviando correo a: ${usuario.email} por caducidad en ${diferenciaDias} día(s)`
        );

        enviarEmail(
          usuario.email,
          "Aviso de caducidad de Acceso a CMAR LIVE",
          personalizarEmail
        );

        console.log(
          `Correo enviado a ${
            usuario.email
          } el ${hoy.toISOString()} para informar de la caducidad en ${diferenciaDias} día(s).`
        );
      }
    }
  }
};

const eliminarCredenciales = async () => {
  const transaction = await db.transaction();
  try {
    const hoy = new Date();

    console.log("Eliminando credenciales...");

    const solicitudes = await SolicitudMultimedia.findAll({
      where: {
        tiempoAprobacion: {
          [Op.lte]: hoy,
        },
        estado: true,
      },
      include: [{ model: Usuario, as: "usuario" }],
    });

    const usuarioIds = solicitudes
      .map((solicitud) => {
        const usuario = solicitud.getDataValue("usuario");
        return usuario ? usuario.id : null;
      })
      .filter((id) => id !== null);

    if (usuarioIds.length > 0) {
      await Usuario.update(
        { login: "", password: "" },
        {
          where: {
            id: {
              [Op.in]: usuarioIds,
            },
          },
          transaction,
        }
      );

      for (const solicitud of solicitudes) {
        const usuario = solicitud.getDataValue("usuario");
        if (usuario) {
          const nombre = `${usuario.primerNombre} ${usuario.segundoNombre} ${usuario.primerApellido} ${usuario.segundoApellido}`;
          const fechaCaducidad = new Date(
            solicitud.getDataValue("tiempoAprobacion")
          ).toLocaleDateString();

          const personalizarEmail = emailTemplateNotificacion
            .replace("{{imagenEmail}}", imagenEmail)
            .replace("{{nombre}}", nombre)
            .replace("{{fechaCaducidad}}", fechaCaducidad);

          console.log(`Enviando notificación a: ${usuario.email}`);

          enviarEmail(
            usuario.email,
            "Notificación de Caducidad de Acceso a CMAR LIVE",
            personalizarEmail
          );

          await SolicitudMultimedia.update(
            { estado: false },
            { where: { id: solicitud.getDataValue("id") }, transaction }
          );
        }
      }
    }

    await transaction.commit();
    console.log("Transacción completada exitosamente.");
  } catch (error) {
    await transaction.rollback();
    console.error("Error al eliminar credenciales y enviar correos:", error);
  }
};

loadEmailTemplates();

cron.schedule("0 3 * * *", async () => {
  console.log("Ejecutando tarea cron...");
  await verificarFechasYEnviarCorreos();
  await eliminarCredenciales();
});

console.log("Cron job configurado para ejecutarse.");
