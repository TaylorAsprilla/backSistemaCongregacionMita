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
  console.log("🔍 Iniciando notificación semanal a aprobadores multimedia...");

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

    console.log(`Encontrados ${aprobadores.length} aprobadores multimedia`);

    // Obtener obreros encargados de países
    const obrerosPais = await Pais.findAll({
      where: {
        idObreroEncargado: { [Op.ne]: null },
        estado: true,
      },
      include: [
        {
          model: Usuario,
          as: "obreroEncargado",
          include: [
            {
              model: UsuarioPermiso,
              as: "usuarioPermiso",
              where: {
                permiso_id: ROLES_ID.APROBADOR_MULTIMEDIA, // ID 11
              },
              required: true,
            },
          ],
        },
      ],
    });

    // Obtener obreros encargados de congregaciones
    const obrerosCongregacion = await Congregacion.findAll({
      where: {
        [Op.or]: [
          { idObreroEncargado: { [Op.ne]: null } },
          { idObreroEncargadoDos: { [Op.ne]: null } },
        ],
        estado: true,
      },
      include: [
        {
          model: Usuario,
          as: "obreroEncargado",
          include: [
            {
              model: UsuarioPermiso,
              as: "usuarioPermiso",
              where: {
                permiso_id: ROLES_ID.APROBADOR_MULTIMEDIA,
              },
              required: true,
            },
          ],
          required: false,
        },
        {
          model: Usuario,
          as: "obreroEncargadoDos",
          include: [
            {
              model: UsuarioPermiso,
              as: "usuarioPermiso",
              where: {
                permiso_id: ROLES_ID.APROBADOR_MULTIMEDIA,
              },
              required: true,
            },
          ],
          required: false,
        },
      ],
    });

    // Obtener obreros encargados de campos
    const obrerosCampo = await Campo.findAll({
      where: {
        [Op.or]: [
          { idObreroEncargado: { [Op.ne]: null } },
          { idObreroEncargadoDos: { [Op.ne]: null } },
        ],
        estado: true,
      },
      include: [
        {
          model: Usuario,
          as: "obreroEncargado",
          include: [
            {
              model: UsuarioPermiso,
              as: "usuarioPermiso",
              where: {
                permiso_id: ROLES_ID.APROBADOR_MULTIMEDIA,
              },
              required: true,
            },
          ],
          required: false,
        },
        {
          model: Usuario,
          as: "obreroEncargadoDos",
          include: [
            {
              model: UsuarioPermiso,
              as: "usuarioPermiso",
              where: {
                permiso_id: ROLES_ID.APROBADOR_MULTIMEDIA,
              },
              required: true,
            },
          ],
          required: false,
        },
      ],
    });

    const fechaReporte = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Procesar obreros de países
    for (const pais of obrerosPais) {
      const obrero = pais.getDataValue("obreroEncargado");
      if (obrero && obrero.getDataValue("email")) {
        const solicitudesPendientes =
          await obtenerSolicitudesPendientesPorCongregacion(
            "pais",
            pais.getDataValue("id"),
          );

        if (solicitudesPendientes.length > 0) {
          const nombreObrero = `${obrero.getDataValue("primerNombre") || ""} ${
            obrero.getDataValue("segundoNombre") || ""
          } ${obrero.getDataValue("primerApellido") || ""} ${
            obrero.getDataValue("segundoApellido") || ""
          }`
            .replace(/\s+/g, " ")
            .trim();

          const emailPersonalizado = renderTemplate(
            emailTemplateSolicitudesPendientes,
            {
              imagenEmail,
              nombreAprobador: nombreObrero,
              tipoCongregacion: "país",
              nombreCongregacion: pais.getDataValue("pais"),
              totalSolicitudes: solicitudesPendientes.length.toString(),
              fechaReporte,
              listaSolicitudes: generarListaSolicitudes(solicitudesPendientes),
            },
          );

          await enviarEmail(
            obrero.getDataValue("email"),
            `Solicitudes Multimedia Pendientes - ${pais.getDataValue("pais")}`,
            emailPersonalizado,
          );

          console.log(
            `Email enviado al Obrero País: ${nombreObrero} (${solicitudesPendientes.length} solicitudes)`,
          );
        }
      }
    }

    // Procesar obreros de congregaciones
    for (const congregacion of obrerosCongregacion) {
      // Obrero principal
      const obreroPrincipal = congregacion.getDataValue("obreroEncargado");
      if (obreroPrincipal && obreroPrincipal.getDataValue("email")) {
        await procesarObreroCongregacion(
          obreroPrincipal,
          congregacion,
          fechaReporte,
        );
      }

      // Obrero secundario
      const obreroSecundario = congregacion.getDataValue("obreroEncargadoDos");
      if (obreroSecundario && obreroSecundario.getDataValue("email")) {
        await procesarObreroCongregacion(
          obreroSecundario,
          congregacion,
          fechaReporte,
        );
      }
    }

    // Procesar obreros de campos
    for (const campo of obrerosCampo) {
      // Obrero principal
      const obreroPrincipal = campo.getDataValue("obreroEncargado");
      if (obreroPrincipal && obreroPrincipal.getDataValue("email")) {
        await procesarObreroCampo(obreroPrincipal, campo, fechaReporte);
      }

      // Obrero secundario
      const obreroSecundario = campo.getDataValue("obreroEncargadoDos");
      if (obreroSecundario && obreroSecundario.getDataValue("email")) {
        await procesarObreroCampo(obreroSecundario, campo, fechaReporte);
      }
    }

    console.log("Proceso de notificación semanal completado exitosamente");
  } catch (error) {
    console.error("Error en notificación semanal a aprobadores:", error);
  }
};

// Función auxiliar para procesar obreros de congregación
const procesarObreroCongregacion = async (
  obrero: any,
  congregacion: any,
  fechaReporte: string,
) => {
  const solicitudesPendientes =
    await obtenerSolicitudesPendientesPorCongregacion(
      "congregacion",
      congregacion.getDataValue("id"),
    );

  if (solicitudesPendientes.length > 0) {
    const nombreObrero = `${obrero.getDataValue("primerNombre") || ""} ${
      obrero.getDataValue("segundoNombre") || ""
    } ${obrero.getDataValue("primerApellido") || ""} ${
      obrero.getDataValue("segundoApellido") || ""
    }`
      .replace(/\s+/g, " ")
      .trim();

    const emailPersonalizado = renderTemplate(
      emailTemplateSolicitudesPendientes,
      {
        imagenEmail,
        nombreAprobador: nombreObrero,
        tipoCongregacion: "congregación",
        nombreCongregacion: congregacion.getDataValue("congregacion"),
        totalSolicitudes: solicitudesPendientes.length.toString(),
        fechaReporte,
        listaSolicitudes: generarListaSolicitudes(solicitudesPendientes),
      },
    );

    await enviarEmail(
      obrero.getDataValue("email"),
      `Solicitudes Multimedia Pendientes - ${congregacion.getDataValue(
        "congregacion",
      )}`,
      emailPersonalizado,
    );

    console.log(
      `Email enviado al Obrero Congregación: ${nombreObrero} (${solicitudesPendientes.length} solicitudes)`,
    );
  }
};

// Función auxiliar para procesar obreros de campo
const procesarObreroCampo = async (
  obrero: any,
  campo: any,
  fechaReporte: string,
) => {
  const solicitudesPendientes =
    await obtenerSolicitudesPendientesPorCongregacion(
      "campo",
      campo.getDataValue("id"),
    );

  if (solicitudesPendientes.length > 0) {
    const nombreObrero = `${obrero.getDataValue("primerNombre") || ""} ${
      obrero.getDataValue("segundoNombre") || ""
    } ${obrero.getDataValue("primerApellido") || ""} ${
      obrero.getDataValue("segundoApellido") || ""
    }`
      .replace(/\s+/g, " ")
      .trim();

    const emailPersonalizado = renderTemplate(
      emailTemplateSolicitudesPendientes,
      {
        imagenEmail,
        nombreAprobador: nombreObrero,
        tipoCongregacion: "campo",
        nombreCongregacion: campo.getDataValue("campo"),
        totalSolicitudes: solicitudesPendientes.length.toString(),
        fechaReporte,
        listaSolicitudes: generarListaSolicitudes(solicitudesPendientes),
      },
    );

    await enviarEmail(
      obrero.getDataValue("email"),
      `Solicitudes Multimedia Pendientes - ${campo.getDataValue("campo")}`,
      emailPersonalizado,
    );

    console.log(
      `Email enviado al Obrero Campo: ${nombreObrero} (${solicitudesPendientes.length} solicitudes)`,
    );
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
