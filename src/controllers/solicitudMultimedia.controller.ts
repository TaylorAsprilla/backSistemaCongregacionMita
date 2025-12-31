import { Request, Response } from "express";
import config from "../config/config";
import enviarEmail from "../helpers/email";
import { CustomRequest } from "../middlewares/validar-jwt";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import Usuario from "../models/usuario.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import Congregacion from "../models/congregacion.model";
import Campo from "../models/campo.model";
import RazonSolicitud from "../models/razonSolicitud.model";
import TipoMiembro from "../models/tipoMiembro.model";
import OpcionTransporte from "../models/opcionTransporte.model";
import Parentesco from "../models/parentesco.model";
import TipoEstudio from "../models/tipoEstudio.model";
import Pais from "../models/pais.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import Permiso from "../models/permiso.model";
import { Op } from "sequelize";
import { SOLICITUD_MULTIMEDIA_ENUM } from "../enum/solicitudMultimendia.enum";
import db from "../database/connection";
import { AUDITORIAUSUARIO_ENUM } from "../enum/auditoriaUsuario.enum";
import { auditoriaUsuario } from "../database/usuario.associations";
import generarPassword from "../helpers/generarPassword";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;
const urlDeValidacion = environment.urlDeValidacion;
const urlCmarLive = environment.urlCmarLive;

const templatePathAccesoExtendido = path.join(
  __dirname,
  "../templates/accesoExtendido.html"
);
const emailTemplateAccesoExtendido = fs.readFileSync(
  templatePathAccesoExtendido,
  "utf8"
);

const templatePathAccesoCmarLive = path.join(
  __dirname,
  "../templates/accesoCmarLive.html"
);
const emailTemplateAccesoCmarLive = fs.readFileSync(
  templatePathAccesoCmarLive,
  "utf8"
);

export const getSolicitudesMultimedia = async (req: Request, res: Response) => {
  try {
    const solicitudDeAccesos = await Usuario.findAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "numeroCelular",
        "email",
        "fechaNacimiento",
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "paisDireccion",
        "login",
      ],
      include: [
        {
          model: SolicitudMultimedia,
          as: "solicitudes",
          attributes: [
            "id",
            "emailVerificado",
            "otraRazon",
            "tiempoDistancia",
            "personaEncamada",
            "personaEncargada",
            "celularPersonaEncargada",
            "enfermedadCronica",
            "enfermedadQuePadece",
            "paisDondeEstudia",
            "ciudadDondeEstudia",
            "duracionDelPeriodoDeEstudio",
            "baseMilitar",
            "horaTemploMasCercano",
            "tiempoSugerido",
            "tiempoAprobacion",
            "motivoDeNegacion",
            "estado",
            "congregacionCercana",
            "observaciones",
            "createdAt",
          ],
          where: {
            emailVerificado: {
              [Op.ne]: null, // Asegurar de que el campo emailVerificado tenga un valor
            },
          },
          include: [
            {
              model: RazonSolicitud,
              as: "razonSolicitud",
              attributes: ["solicitud"],
            },
            {
              model: OpcionTransporte,
              as: "opcionTransporte",
              attributes: ["tipoTransporte"],
            },
            {
              model: Usuario,
              as: "usuarioQueRegistra",
              attributes: [
                "id",
                "primerNombre",
                "segundoNombre",
                "primerApellido",
                "segundoApellido",
              ],
            },
            {
              model: Usuario,
              as: "usuarioQueAprobo",
              attributes: [
                "id",
                "primerNombre",
                "segundoNombre",
                "primerApellido",
                "segundoApellido",
              ],
            },
            {
              model: Parentesco,
              as: "parentesco",
              attributes: ["nombre"],
            },
            {
              model: TipoEstudio,
              as: "tipoEstudio",
              attributes: ["estudio"],
            },
          ],
        },
        {
          model: TipoMiembro,
          as: "tipoMiembro",
          attributes: ["miembro"],
        },
        {
          model: UsuarioCongregacion,
          as: "usuarioCongregacion",
          attributes: ["id"],
          include: [
            {
              model: Pais,
              as: "pais",
              attributes: ["id", "pais"],
              include: [
                {
                  model: Usuario,
                  as: "obreroEncargado",
                  attributes: [
                    "id",
                    "primerNombre",
                    "segundoNombre",
                    "primerApellido",
                    "segundoApellido",
                  ],
                },
              ],
            },
            {
              model: Congregacion,
              as: "congregacion",
              attributes: ["id", "congregacion"],
              include: [
                {
                  model: Usuario,
                  as: "obreroEncargado",
                  attributes: [
                    "id",
                    "primerNombre",
                    "segundoNombre",
                    "primerApellido",
                    "segundoApellido",
                  ],
                },
              ],
            },
            {
              model: Campo,
              as: "campo",
              attributes: ["id", "campo"],
              include: [
                {
                  model: Usuario,
                  as: "obreroEncargado",
                  attributes: [
                    "id",
                    "primerNombre",
                    "segundoNombre",
                    "primerApellido",
                    "segundoApellido",
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const numeroDeSolicitudes = solicitudDeAccesos.length;

    res.json({
      ok: true,
      numeroDeSolicitudes,
      solicitudDeAccesos,
    });
  } catch (error) {
    console.error("Error al obtener las solicitudes multimedia:", error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnaSolicitudMultimedia = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  const solicitudDeAcceso = await SolicitudMultimedia.findByPk(id, {
    include: [
      {
        all: true,
        required: false,
      },
    ],
  });

  if (solicitudDeAcceso) {
    res.json({
      ok: true,
      solicitudDeAcceso,
      id,
    });
  }
};

export const obtenerSolicitudPorUsuario = async (
  req: Request,
  res: Response
) => {
  const { usuario_id } = req.query;

  const transaction = await db.transaction();

  try {
    const solicitudExistente = await SolicitudMultimedia.findOne({
      where: {
        usuario_id,
        estado: {
          [Op.or]: [
            SOLICITUD_MULTIMEDIA_ENUM.APROBADA,
            SOLICITUD_MULTIMEDIA_ENUM.EMAIL_NO_VERIFICADO,
          ],
        },
      },
      transaction,
    });

    await transaction.commit();

    if (solicitudExistente) {
      return res.json({
        ok: true,
        msg: `Ya existe una solicitud multimedia para el feligrés con el número Mita: ${usuario_id}`,
        usuario_id,
      });
    } else {
      return res.json({
        ok: false,
        msg: `No existe una solicitud multimedia para el feligrés con el número Mita: ${usuario_id}`,
        usuario_id,
      });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error al obtener la solicitud multimedia:", error);
    return res.status(500).json({
      ok: false,
      msg: "Hubo un error al obtener la solicitud multimedia.",
      error,
    });
  }
};

export const obtenerUsuariosConSolicitudesPorCongregacion = async (
  req: Request,
  res: Response
) => {
  const { usuario_id } = req.query;

  try {
    // Obtener el país y la congregación a cargo del usuario
    const congregacionPais = await Pais.findOne({
      where: { idObreroEncargado: usuario_id, estado: true },
    });

    const congregacionCiudad = await Congregacion.findOne({
      where: {
        estado: true,
        [Op.or]: [
          { idObreroEncargado: usuario_id },
          { idObreroEncargadoDos: usuario_id },
        ],
      },
    });

    const congregacionCampo = await Campo.findOne({
      where: {
        estado: true,
        [Op.or]: [
          { idObreroEncargado: usuario_id },
          { idObreroEncargadoDos: usuario_id },
        ],
      },
    });

    const pais_id = congregacionPais?.getDataValue("id");
    const congregacion_id = congregacionCiudad?.getDataValue("id");
    const campo_id = congregacionCampo?.getDataValue("id");

    if (!pais_id && !congregacion_id && !campo_id) {
      return res.status(400).json({
        ok: false,
        msg: "El usuario no tiene un país o congregación a cargo",
      });
    }

    // Construir la condición de búsqueda
    let whereCondition = {};

    if (pais_id && congregacion_id) {
      whereCondition = {
        [Op.or]: [
          { "$usuarioCongregacion.pais_id$": pais_id },
          { "$usuarioCongregacion.congregacion_id$": congregacion_id },
        ],
      };
    } else if (pais_id) {
      whereCondition = { "$usuarioCongregacion.pais_id$": pais_id };
    } else if (congregacion_id) {
      whereCondition = {
        "$usuarioCongregacion.congregacion_id$": congregacion_id,
      };
    } else if (campo_id) {
      whereCondition = {
        "$usuarioCongregacion.campo_id$": campo_id,
      };
    }

    // Consulta a la base de datos con filtros dinámicos
    const usuarios = await Usuario.findAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "numeroCelular",
        "email",
        "fechaNacimiento",
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "paisDireccion",
        "login",
      ],
      include: [
        {
          model: SolicitudMultimedia,
          as: "solicitudes",
          attributes: [
            "id",
            "emailVerificado",
            "otraRazon",
            "tiempoDistancia",
            "personaEncamada",
            "personaEncargada",
            "celularPersonaEncargada",
            "enfermedadCronica",
            "enfermedadQuePadece",
            "paisDondeEstudia",
            "ciudadDondeEstudia",
            "duracionDelPeriodoDeEstudio",
            "baseMilitar",
            "horaTemploMasCercano",
            "tiempoSugerido",
            "tiempoAprobacion",
            "motivoDeNegacion",
            "congregacionCercana",
            "estado",
            "observaciones",
            "createdAt",
          ],
          where: {
            emailVerificado: {
              [Op.ne]: null, // Asegurar de que el campo emailVerificado tenga un valor
            },
          },
          include: [
            {
              model: RazonSolicitud,
              as: "razonSolicitud",
              attributes: ["solicitud"],
            },
            {
              model: OpcionTransporte,
              as: "opcionTransporte",
              attributes: ["tipoTransporte"],
            },
            {
              model: Usuario,
              as: "usuarioQueRegistra",
              attributes: [
                "id",
                "primerNombre",
                "segundoNombre",
                "primerApellido",
                "segundoApellido",
              ],
            },
            {
              model: Usuario,
              as: "usuarioQueAprobo",
              attributes: [
                "id",
                "primerNombre",
                "segundoNombre",
                "primerApellido",
                "segundoApellido",
              ],
            },

            {
              model: Parentesco,
              as: "parentesco",
              attributes: ["nombre"],
            },
            {
              model: TipoEstudio,
              as: "tipoEstudio",
              attributes: ["estudio"],
            },
          ],
        },
        {
          model: TipoMiembro,
          as: "tipoMiembro",
          attributes: ["miembro"],
        },
        {
          model: UsuarioCongregacion,
          as: "usuarioCongregacion",
          attributes: ["id"],
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
      ],
      where: whereCondition,
    });

    // Responder con los resultados
    return res.status(200).json({
      ok: true,
      total: usuarios.length,
      usuarios: usuarios || [],
    });
  } catch (error) {
    console.error(
      "Error al obtener usuarios con solicitudes pendientes:",
      error
    );
    return res.status(500).json({
      ok: false,
      msg: "Hubo un error al obtener los usuarios con solicitudes pendientes.",
    });
  }
};

export const crearSolicitudMultimedia = async (req: Request, res: Response) => {
  const { body } = req;
  const { usuario_id } = body;

  try {
    // =======================================================================
    //                          Guardar Acceso Multimedia
    // =======================================================================

    const solicitudDeAcceso = SolicitudMultimedia.build(body);
    await solicitudDeAcceso.save();

    const idUsuario = solicitudDeAcceso.getDataValue("id");
    const usuario = await Usuario.findByPk(usuario_id);
    const email = usuario?.getDataValue("email");
    const nombre = `${usuario?.getDataValue("primerNombre") || ""} 
    ${usuario?.getDataValue("segundoNombre") || ""}
    ${usuario?.getDataValue("primerApellido") || ""} 
    ${usuario?.getDataValue("segundoApellido") || ""}`;

    // =======================================================================
    //                         Enviar Correo de Verificación
    // =======================================================================
    const html = `
      <div
        style="
          max-width: 100%;
          width: 600px;
          margin: 0 auto;
          box-sizing: border-box;
          font-family: Arial, Helvetica, 'sans-serif';
          font-weight: normal;
          font-size: 16px;
          line-height: 22px;
          color: #252525;
          word-wrap: break-word;
          word-break: break-word;
          text-align: justify;
        "
      >
        <div style="text-align: center">
          <img
            src="${imagenEmail}"
            alt="CMAR Multimedia"
            style="text-align: center; width: 100px"
          />
        </div>
        <h3>Verifica tu cuenta de correo electrónico</h3>
        <p>Hola, <span style="text-transform: capitalize;">${nombre}</span></p>
        <p>
          Ha registrado ${email} como cuenta de correo electrónico para <b>CMAR LIVE.</b> Por
          favor verifique su cuenta de correo electrónico haciendo clic en el
          siguiente enlace:
        </p>
      
        <div
          title="Verificar Cuenta"
          style="text-align: center; margin: 24px 0 40px 0; padding: 0"
        >
          <a
            href="${urlDeValidacion}/${idUsuario}"
            style="
              display: inline-block;
              margin: 0 auto;
              min-width: 180px;
              line-height: 28px;
              border-radius: 22px;
              padding: 8px 16px 7px 16px;
              vertical-align: middle;
              background-color: #0072de;
              color: #fff;
              box-sizing: border-box;
              text-align: center;
              text-decoration: none;
              font-family: Arial, Helvetica, 'sans-serif';
              font-weight: normal;
              word-wrap: break-word;
              word-break: break-all;
            "
            target="_blank"
          >
            Verificar cuenta
          </a>
        </div>
      
        <p>
          Si el enlace anterior no funciona, introduzca la dirección su navegador.
        </p>
      
        <a href="${urlDeValidacion}/${idUsuario}">${urlDeValidacion}/${idUsuario}</a>
      
        <div>
          <p
            style="
              margin: 30px 0 12px 0;
              padding: 0;
              color: #252525;
              font-family: Arial, Helvetica, 'sans-serif';
              font-weight: normal;
              word-wrap: break-word;
              word-break: break-word;
              font-size: 12px;
              line-height: 16px;
              color: #909090;
            "
          >
            Nota: No responda a este correo electrónico. Si tiene alguna duda, póngase
            en contacto con nosotros mediante nuestro correo electrónico
            <a href="mailto:cmar.live@congregacionmita.com">
              cmar.live@congregacionmita.com</a
            >
          </p>
      
          <br />
          Cordialmente,<br />
          <b>Congregación Mita, Inc.</b>
        </div>
      </div>`;

    await enviarEmail(email, "Verificar Correo - CMAR Multimedia", html);

    res.json({
      ok: true,
      msg: "Se ha guardado la solicitud exitosamente ",
      solicitudDeAcceso,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
      body,
    });
  }
};

export const actualizarSolicitudMultimedia = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  console.log("ID de la solicitud a actualizar:", body);

  const transaction = await db.transaction();

  try {
    const solicitudDeAcceso = await SolicitudMultimedia.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
            "email",
            "login",
            "password",
          ],
        },
      ],
      transaction,
    });

    if (!solicitudDeAcceso) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe una solicitud con el id ${id}`,
      });
    }

    const usuario = solicitudDeAcceso.get("usuario") as any;
    const usuario_id = usuario?.id;
    const emailUsuario = usuario?.email;
    const nombreUsuario = `${usuario?.primerNombre || ""} ${
      usuario?.segundoNombre || ""
    } ${usuario?.primerApellido || ""} ${
      usuario?.segundoApellido || ""
    }`.trim();

    // Verificar si tiempoAprobacion cambió
    const tiempoAprobacionAnterior =
      solicitudDeAcceso.getDataValue("tiempoAprobacion");
    const tiempoAprobacionNuevo = body.tiempoAprobacion;

    const tiempoAprobacionCambio =
      tiempoAprobacionNuevo &&
      tiempoAprobacionAnterior !== tiempoAprobacionNuevo;

    // =======================================================================
    //             Verificar y Crear Credenciales si no existen
    // =======================================================================

    const usuarioLogin = usuario?.login;
    const usuarioPassword = usuario?.password;
    let credencialesCreadas = false;
    let passwordGenerado = "";

    if (!usuarioLogin || !usuarioPassword) {
      // Crear nuevas credenciales
      const nuevoLogin = emailUsuario;
      passwordGenerado = generarPassword();
      const salt = bcrypt.genSaltSync();
      const hashedPassword = bcrypt.hashSync(passwordGenerado, salt);

      await Usuario.update(
        { login: nuevoLogin, password: hashedPassword },
        { where: { id: usuario_id }, transaction }
      );

      credencialesCreadas = true;
      console.log(
        `Nuevas credenciales creadas para el usuario ${usuario_id}: ${nuevoLogin}`
      );
    }

    // =======================================================================
    //             Verificar y Agregar Permiso de Multimedia
    // =======================================================================

    // Buscar el permiso de "Multimedia"
    const permisoMultimedia = await Permiso.findOne({
      where: {
        permiso: "Multimedia",
        estado: true,
      },
      transaction,
    });

    if (permisoMultimedia) {
      const permisoMultimediaId = permisoMultimedia.getDataValue("id");

      // Verificar si el usuario ya tiene el permiso
      const usuarioTienePermiso = await UsuarioPermiso.findOne({
        where: {
          usuario_id: usuario_id,
          permiso_id: permisoMultimediaId,
        },
        transaction,
      });

      // Si no tiene el permiso, agregarlo
      if (!usuarioTienePermiso) {
        await UsuarioPermiso.create(
          {
            usuario_id: usuario_id,
            permiso_id: permisoMultimediaId,
          },
          { transaction }
        );
        console.log(
          `Permiso Multimedia agregado al usuario ${usuario_id} (${nombreUsuario})`
        );
      }
    }

    // =======================================================================
    //                          Actualizar la Solicitud de Accesos
    // =======================================================================

    const solicitudDeAccesoActualizado = await solicitudDeAcceso.update(body, {
      new: true,
      transaction,
    });

    // =======================================================================
    //          Enviar emails según el caso
    // =======================================================================

    if (emailUsuario) {
      try {
        // Formatear la fecha
        const fechaFormateada = tiempoAprobacionNuevo
          ? new Date(tiempoAprobacionNuevo).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "";

        // CASO 1: Se crearon nuevas credenciales
        if (credencialesCreadas) {
          const mensajeCredenciales = `
            <p><b>Credenciales de ingreso:</b></p>
            <ul style="list-style: none">
              <li><b>Link de Acceso:&nbsp;</b> <a href="${urlCmarLive}">cmar.live</a></li>
              <li><b>Usuario:&nbsp;</b> ${emailUsuario}</li>
              <li><b>Contraseña:&nbsp;</b> ${passwordGenerado}</li>
              ${
                fechaFormateada
                  ? `<li><b>Tiempo de aprobación:&nbsp;</b> ${fechaFormateada}</li>`
                  : ""
              }
            </ul>
            <p style="color: #d9534f; font-weight: bold;">
              ⚠️ Importante: Guarde esta contraseña en un lugar seguro. Por motivos de seguridad, no podremos recuperarla más adelante.
            </p>
            <p>
              Si desea cambiar su contraseña en cualquier momento, puede hacerlo desde la plataforma seleccionando la opción <b>"Olvidé mi contraseña"</b> o contactando al administrador.
            </p>
          `;

          const emailPersonalizado = emailTemplateAccesoCmarLive
            .replace("{{imagenEmail}}", imagenEmail)
            .replace("{{nombre}}", nombreUsuario)
            .replace("{{mensajeCorreo}}", mensajeCredenciales);

          await enviarEmail(
            emailUsuario,
            "Bienvenido a CMAR LIVE - Sus nuevas credenciales de acceso",
            emailPersonalizado
          );

          console.log(
            `Email con credenciales nuevas enviado a ${emailUsuario} (${nombreUsuario})`
          );
        }
        // CASO 2: Ya tenía credenciales pero cambió tiempoAprobacion
        else if (tiempoAprobacionCambio) {
          const mensajeExtension = `
            <p><b>Su acceso ha sido extendido hasta:</b> ${fechaFormateada}</p>
            <p>
              En caso de necesitar cambiar su contraseña, puede restablecerla fácilmente seleccionando la opción <b>"Olvidé mi contraseña"</b> en la plataforma <a href="${urlCmarLive}">cmar.live</a>.
            </p>
          `;

          const emailPersonalizado = emailTemplateAccesoExtendido
            .replace("{{imagenEmail}}", imagenEmail)
            .replace("{{nombre}}", nombreUsuario)
            .replace("{{fechaExtension}}", fechaFormateada)
            .replace("</body>", `${mensajeExtension}</body>`);

          await enviarEmail(
            emailUsuario,
            "Su acceso a CMAR LIVE ha sido extendido",
            emailPersonalizado
          );

          console.log(
            `Email de extensión enviado a ${emailUsuario} (${nombreUsuario})`
          );
        }
        // CASO 3: Ya tenía credenciales y se actualizó la solicitud (pero no cambió tiempoAprobacion)
        else {
          const mensajeCredenciales = `
            <h4>Información importante sobre sus credenciales</h4>
            <p>
              Nos complace informarle que sus credenciales de acceso se mantienen sin cambios, ya que ya dispone de un usuario registrado en nuestra plataforma.
            </p>
            <ul>
              <li><b>Link de Acceso:&nbsp;</b> <a href="${urlCmarLive}">cmar.live</a></li>
              <li><b>Usuario:&nbsp;</b> ${usuarioLogin}</li>
              ${
                fechaFormateada
                  ? `<li><b>Tiempo de aprobación:&nbsp;</b> ${fechaFormateada}</li>`
                  : ""
              }
            </ul>
            <p>En caso de no recordar su contraseña, puede restablecerla fácilmente seleccionando la opción <b>"Olvidé mi contraseña"</b> en la plataforma.</p>
          `;

          const emailPersonalizado = emailTemplateAccesoCmarLive
            .replace("{{imagenEmail}}", imagenEmail)
            .replace("{{nombre}}", nombreUsuario)
            .replace("{{mensajeCorreo}}", mensajeCredenciales);

          await enviarEmail(
            emailUsuario,
            "Actualización de su solicitud CMAR LIVE",
            emailPersonalizado
          );

          console.log(
            `Email de actualización enviado a ${emailUsuario} (${nombreUsuario})`
          );
        }
      } catch (emailError) {
        console.error("Error al enviar email:", emailError);
        // No detener la ejecución si falla el envío del email
      }
    }

    await transaction.commit();

    res.json({
      ok: true,
      msg: "Solicitud de Acceso Actualizada",
      solicitudDeAccesoActualizado,
      credencialesCreadas,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al actualizar la solicitud de acceso:", error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarSolicitudMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await SolicitudMultimedia.findByPk(id);
    if (!!solicitudDeAcceso) {
      const nombre = await solicitudDeAcceso.get().nombre;

      if (solicitudDeAcceso.get().estado === false) {
        await solicitudDeAcceso.update({ estado: true });
        res.json({
          ok: true,
          msg: `La solicitud de acceso al canal de multimedia de ${nombre} se activó`,
          solicitudDeAcceso,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La solicitud de acceso al canal de multimedia de ${nombre} esta activo`,
          solicitudDeAcceso,
        });
      }
    }

    if (!solicitudDeAcceso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una solicitud de acceso al canal de multimedia de con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const eliminarSolicitudMultimediaDeUnUsuario = async (
  req: CustomRequest,
  res: Response
) => {
  const { usuario_id } = req.query;

  console.log("Eliminando solicitudes multimedia para el usuario:", usuario_id);
  const transaction = await db.transaction();

  try {
    // Buscar la solicitud en estado APROBADA, PENDIENTE o EMAIL_NO_VERIFICADO
    const solicitudes = await SolicitudMultimedia.findAll({
      where: {
        usuario_id,
        estado: {
          [Op.or]: [
            SOLICITUD_MULTIMEDIA_ENUM.PENDIENTE,
            SOLICITUD_MULTIMEDIA_ENUM.EMAIL_NO_VERIFICADO,
          ],
        },
      },
      transaction,
    });

    if (solicitudes.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe una solicitud en estado PENDIENTE o EMAIL_NO_VERIFICADO para el usuario con ID: ${usuario_id}`,
      });
    }

    // Actualizar las solicitudes como eliminadas
    for (const solicitud of solicitudes) {
      await solicitud.update(
        {
          motivoDeNegacion:
            "Solicitud eliminada, porque se creó una solicitud nueva",
          tiempoAprobacion: null,
          estado: SOLICITUD_MULTIMEDIA_ENUM.ELIMINADA,
          usuarioQueAprobo_id: req.id,
        },
        { transaction }
      );

      // Registrar en la auditoría
      await auditoriaUsuario(
        Number(usuario_id),
        Number(req.id),
        AUDITORIAUSUARIO_ENUM.ELIMINAR_SOLICITUD,
        transaction
      );
    }

    await transaction.commit();

    return res.status(200).json({
      ok: true,
      msg: "Solicitudes eliminadas correctamente",
      solicitudes,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al eliminar las solicitudes:", error);
    return res.status(500).json({
      ok: false,
      msg: "Hubo un error al eliminar las solicitudes.",
      error,
    });
  }
};

export const buscarCorreoElectronico = async (req: Request, res: Response) => {
  const email = req.params.email;

  if (!email) {
    res.status(500).json({
      ok: false,
      msg: `No existe parametro en la petición`,
    });
  } else {
    try {
      const correoElectronico = await SolicitudMultimedia.findOne({
        attributes: ["email"],
        where: {
          email: email,
        },
      });

      if (!!correoElectronico) {
        res.json({
          ok: false,
          msg: `Ya se encuentra registrado el correo electrónico ${email}`,
        });
      } else {
        res.json({
          ok: true,
          msg: `Correo electrónico válido`,
        });
      }
    } catch (error) {
      res.status(500).json({
        error,
        msg: "Hable con el administrador",
      });
    }
  }
};

export const validarEmail = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  try {
    const verificarStatus = await SolicitudMultimedia.findByPk(id);
    if (!!verificarStatus) {
      const nombre = await verificarStatus.get().nombre;

      if (
        verificarStatus.get().emailVerificado === false ||
        verificarStatus.get().emailVerificado ===
          SOLICITUD_MULTIMEDIA_ENUM.EMAIL_NO_VERIFICADO
      ) {
        await verificarStatus.update({
          emailVerificado: true,
          estado: SOLICITUD_MULTIMEDIA_ENUM.PENDIENTE,
        });
        res.json({
          ok: true,
          msg: `El correo electrónico de ${nombre} esta verificado`,
          verificarStatus,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El correo electrónico de ${nombre} esta verificado`,
          verificarStatus,
        });
      }
    }

    if (!verificarStatus) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una verificación de correo electrónico para este usuario`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
