import fs from "fs";
import path from "path";
import cron from "node-cron";
import { Op } from "sequelize";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import Usuario from "../models/usuario.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import Pais from "../models/pais.model";
import Congregacion from "../models/congregacion.model";
import Campo from "../models/campo.model";
import enviarEmail from "../helpers/email";
import config from "../config/config";
import logger from "../helpers/logger";
import { SOLICITUD_MULTIMEDIA_ENUM } from "../enum/solicitudMultimendia.enum";
import { ROLES_ID } from "../enum/roles.enum";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

let emailTemplateSolicitudesPendientes: string;

// Cargar plantilla de correo una vez al inicio
const loadEmailTemplate = () => {
  const templatePath = path.join(
    __dirname,
    "../templates/solicitudesPendientesAprobador.html",
  );
  emailTemplateSolicitudesPendientes = fs.readFileSync(templatePath, "utf8");
};

// Helper para renderizar plantillas de email
function renderTemplate(template: string, variables: Record<string, string>) {
  let result = template;
  for (const key in variables) {
    const value = variables[key] ?? "";
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

// Función para obtener las solicitudes pendientes por jurisdicción
const obtenerSolicitudesPendientesPorCongregacion = async (
  tipoCongregacion: "pais" | "congregacion" | "campo",
  congregacionId: number,
) => {
  try {
    const whereCondition: any = {
      estado: SOLICITUD_MULTIMEDIA_ENUM.PENDIENTE,
      emailVerificado: true,
    };

    // Definir las condiciones según el tipo de jurisdicción
    const includeCondition: any = [
      {
        model: UsuarioCongregacion,
        as: "usuarioCongregacion",
        required: true,
        where: {},
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "pais"],
          },
          {
            model: Congregacion,
            as: "congregacion",
            attributes: ["id", "congregacion"],
          },
          {
            model: Campo,
            as: "campo",
            attributes: ["id", "campo"],
          },
        ],
      },
    ];

    // Agregar condición específica según la congregacion
    switch (tipoCongregacion) {
      case "pais":
        includeCondition[0].where = { pais_id: congregacionId };
        break;
      case "congregacion":
        includeCondition[0].where = { congregacion_id: congregacionId };
        break;
      case "campo":
        includeCondition[0].where = { campo_id: congregacionId };
        break;
    }

    const solicitudes = await Usuario.findAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "email",
        "numeroCelular",
      ],
      include: [
        {
          model: SolicitudMultimedia,
          as: "solicitudes",
          where: {
            estado: SOLICITUD_MULTIMEDIA_ENUM.PENDIENTE,
            emailVerificado: true,
          },
          attributes: ["id", "createdAt", "observaciones"],
          required: true,
        },
        ...includeCondition,
      ],
    });

    return solicitudes;
  } catch (error) {
    console.error("Error obteniendo solicitudes pendientes:", error);
    return [];
  }
};

// Función para generar la lista HTML de solicitudes
const generarListaSolicitudes = (solicitudes: any[]) => {
  if (solicitudes.length === 0) {
    return '<p style="margin: 0; color: #6c757d;">No hay solicitudes pendientes en este momento.</p>';
  }

  let listaHtml =
    '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">';
  listaHtml += `
    <thead>
      <tr style="background-color: #f1f3f4;">
        <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">N° Mita</th>
        <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Nombre</th>
        <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Email</th>
        <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Fecha Solicitud</th>
      </tr>
    </thead>
    <tbody>
  `;

  solicitudes.forEach((usuario) => {
    const nombre = `${usuario.getDataValue("primerNombre") || ""} ${
      usuario.getDataValue("segundoNombre") || ""
    } ${usuario.getDataValue("primerApellido") || ""} ${
      usuario.getDataValue("segundoApellido") || ""
    }`
      .replace(/\s+/g, " ")
      .trim();

    const solicitud = usuario.getDataValue("solicitudes")?.[0];
    const fechaSolicitud = solicitud
      ? new Date(solicitud.getDataValue("createdAt")).toLocaleDateString(
          "es-ES",
        )
      : "N/A";

    listaHtml += `
      <tr>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${usuario.getDataValue(
          "id",
        )}</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${nombre}</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${
          usuario.getDataValue("email") || "N/A"
        }</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${fechaSolicitud}</td>
      </tr>
    `;
  });

  listaHtml += "</tbody></table>";
  return listaHtml;
};

// Función principal para enviar notificaciones a aprobadores
const notificarAprobadoresMultimedia = async () => {
  logger.info("🔍 Iniciando notificación semanal a aprobadores multimedia...");

  try {
    // Obtener todos los usuarios con permiso de ADMINISTRADOR_MULTIMEDIA (ID 7)
    const aprobadores = await Usuario.findAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "email",
      ],
      include: [
        {
          model: UsuarioPermiso,
          as: "usuarioPermiso",
          where: {
            permiso_id: ROLES_ID.APROBADOR_MULTIMEDIA, // ID 11
          },
          attributes: [],
          required: true,
        },
        {
          model: UsuarioCongregacion,
          as: "usuarioCongregacion",
          include: [
            {
              model: Pais,
              as: "pais",
              attributes: ["id", "pais"],
            },
            {
              model: Congregacion,
              as: "congregacion",
              attributes: ["id", "congregacion"],
            },
            {
              model: Campo,
              as: "campo",
              attributes: ["id", "campo"],
            },
          ],
          required: false,
        },
      ],
    });

    logger.info(`Encontrados ${aprobadores.length} aprobadores multimedia`);

    const fechaReporte = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Procesar cada aprobador multimedia
    for (const aprobador of aprobadores) {
      const email = aprobador.getDataValue("email");
      if (!email) {
        console.log(
          `Aprobador ID ${aprobador.getDataValue("id")} no tiene email configurado`,
        );
        continue;
      }

      const usuarioCongregacion = aprobador.getDataValue("usuarioCongregacion");
      if (!usuarioCongregacion) {
        console.log(`Aprobador ${email} no tiene congregación asignada`);
        continue;
      }

      const nombreAprobador =
        `${aprobador.getDataValue("primerNombre") || ""} ${
          aprobador.getDataValue("segundoNombre") || ""
        } ${aprobador.getDataValue("primerApellido") || ""} ${
          aprobador.getDataValue("segundoApellido") || ""
        }`
          .replace(/\s+/g, " ")
          .trim();

      // Determinar jurisdicción del aprobador y obtener solicitudes
      let solicitudesPendientes: any[] = [];
      let tipoCongregacion = "";
      let nombreCongregacion = "";

      // Verificar jurisdicción por orden de prioridad: Campo > Congregación > País
      const campoId = usuarioCongregacion.getDataValue("campo_id");
      const congregacionId =
        usuarioCongregacion.getDataValue("congregacion_id");
      const paisId = usuarioCongregacion.getDataValue("pais_id");

      if (campoId) {
        // Tiene campo asignado
        solicitudesPendientes =
          await obtenerSolicitudesPendientesPorCongregacion("campo", campoId);
        tipoCongregacion = "campo";
        const campo = usuarioCongregacion.getDataValue("campo");
        nombreCongregacion = campo ? campo.getDataValue("campo") : "Campo";
      } else if (congregacionId) {
        // Tiene congregación asignada
        solicitudesPendientes =
          await obtenerSolicitudesPendientesPorCongregacion(
            "congregacion",
            congregacionId,
          );
        tipoCongregacion = "congregación";
        const congregacion = usuarioCongregacion.getDataValue("congregacion");
        nombreCongregacion = congregacion
          ? congregacion.getDataValue("congregacion")
          : "Congregación";
      } else if (paisId) {
        // Tiene país asignado
        solicitudesPendientes =
          await obtenerSolicitudesPendientesPorCongregacion("pais", paisId);
        tipoCongregacion = "país";
        const pais = usuarioCongregacion.getDataValue("pais");
        nombreCongregacion = pais ? pais.getDataValue("pais") : "País";
      } else {
        console.log(
          `Aprobador ${email} no tiene ninguna jurisdicción asignada`,
        );
        continue;
      }

      // Enviar email solo si hay solicitudes pendientes
      if (solicitudesPendientes.length > 0) {
        const emailPersonalizado = renderTemplate(
          emailTemplateSolicitudesPendientes,
          {
            imagenEmail,
            nombreAprobador,
            tipoCongregacion,
            nombreCongregacion,
            totalSolicitudes: solicitudesPendientes.length.toString(),
            fechaReporte,
            listaSolicitudes: generarListaSolicitudes(solicitudesPendientes),
          },
        );

        await enviarEmail(
          email,
          `Solicitudes Multimedia Pendientes - ${nombreCongregacion}`,
          emailPersonalizado,
        );

        console.log(
          `✅ Email enviado a ${nombreAprobador} (${email}) - ${tipoCongregacion}: ${nombreCongregacion} (${solicitudesPendientes.length} solicitudes)`,
        );
      } else {
        console.log(
          `ℹ️ ${nombreAprobador} (${email}) no tiene solicitudes pendientes en ${tipoCongregacion}: ${nombreCongregacion}`,
        );
      }
    }

    logger.info("Proceso de notificación semanal completado exitosamente");
  } catch (error) {
    console.error("Error en notificación semanal a aprobadores:", error);
  }
};

// Cargar plantilla al inicio
loadEmailTemplate();

const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production") {
  // Programar cron job para ejecutarse todos los lunes a las 9:00 AM
  // 0 9 * * 1 = minuto 0, hora 9, cualquier día del mes, cualquier mes, lunes (1)
  cron.schedule("0 9 * * 1", async () => {
    console.log(
      "Ejecutando notificación semanal de solicitudes multimedia pendientes...",
    );
    await notificarAprobadoresMultimedia();
  });

  // Para pruebas, descomenta la siguiente línea (ejecuta cada minuto):
  // cron.schedule("* * * * *", async () => {
  //   console.log("🧪 [PRUEBA] Ejecutando notificación de solicitudes multimedia pendientes...");
  //   await notificarAprobadoresMultimedia();
  // });

  console.info(
    "Cron job de notificación semanal configurado para ejecutarse todos los lunes a las 9:00 AM",
  );
} else {
  console.info(
    `Cron job de notificación semanal desactivado en entorno: ${nodeEnv}`,
  );
}

export { notificarAprobadoresMultimedia };
