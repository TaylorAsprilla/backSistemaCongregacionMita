import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import enviarEmail from "../helpers/email";
import config from "../config/config";
import Usuario from "../models/usuario.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import { ROLES_ID } from "../enum/roles.enum";
import db from "../database/connection";
import Congregacion from "../models/congregacion.model";
import path from "path";
import fs from "fs";
import { auditoriaUsuario } from "../database/usuario.associations";
import { AUDITORIAUSUARIO_ENUM } from "../enum/auditoriaUsuario.enum";
import { SOLICITUD_MULTIMEDIA_ENUM } from "../enum/solicitudMultimendia.enum";
import { CustomRequest } from "../middlewares/validar-jwt";
import { Op } from "sequelize";
import { format } from "date-fns";

const environment = config[process.env.NODE_ENV || "development"];

const imagenEmail = environment.imagenEmail;
const urlCmarLive = environment.urlCmarLive;

export const crearAccesoMultimedia = async (req: Request, res: Response) => {
  const {
    solicitud_id,
    tiempoAprobacion,
    usuarioQueAprobo_id,
    login,
    password,
  } = req.body;

  let nombre: string = "";
  let email: string = "";
  let tiempoAprobacionDate = new Date(tiempoAprobacion);
  const formattedTiempoAprobacion = format(tiempoAprobacionDate, "yyyy-MM-dd");

  const transaction = await db.transaction();

  // =======================================================================
  //                          Validar Solicitud
  // =======================================================================
  try {
    const solicitud = await SolicitudMultimedia.findByPk(solicitud_id);

    if (!solicitud) {
      return res.status(400).json({
        ok: false,
        msg: `No existe una solicitud diligenciada para el usuario ID: ${solicitud_id}`,
      });
    }

    const usuario_id = solicitud.getDataValue("usuario_id");
    const usuario = await Usuario.findByPk(usuario_id);

    if (!usuario) {
      return res.status(400).json({
        ok: false,
        msg: `No existe un usuario asociado al ID: ${usuario_id}`,
      });
    }

    email = usuario.getDataValue("email");
    nombre = `
      ${usuario.getDataValue("primerNombre")} 
      ${usuario.getDataValue("segundoNombre")} 
      ${usuario.getDataValue("primerApellido")} 
      ${usuario.getDataValue("segundoApellido")}
    `.trim();

    // ================= OBTENER OBREROS DE LA CONGREGACIÓN =====================
    let nombreObrerosCongregacion: string[] = [];
    let correosObrerosCongregacion: string[] = [];

    // Buscar la congregación del usuario usando UsuarioCongregacion
    const usuarioCongregacion = await db.models.UsuarioCongregacion.findOne({
      where: { usuario_id },
    });

    if (
      usuarioCongregacion &&
      usuarioCongregacion.getDataValue("congregacion_id")
    ) {
      const congregacion = await Congregacion.findByPk(
        usuarioCongregacion.getDataValue("congregacion_id")
      );
      if (congregacion) {
        // Buscar obreros asignados (pueden ser uno o dos)
        const obrerosIds: number[] = [];
        if (congregacion.getDataValue("idObreroEncargado"))
          obrerosIds.push(congregacion.getDataValue("idObreroEncargado"));
        if (congregacion.getDataValue("idObreroEncargadoDos"))
          obrerosIds.push(congregacion.getDataValue("idObreroEncargadoDos"));

        if (obrerosIds.length) {
          const obreros = await Usuario.findAll({
            where: { id: obrerosIds },
            attributes: [
              "primerNombre",
              "segundoNombre",
              "primerApellido",
              "segundoApellido",
              "email",
            ],
          });
          nombreObrerosCongregacion = obreros.map((o) =>
            `${o.getDataValue("primerNombre") || ""} ${
              o.getDataValue("segundoNombre") || ""
            } ${o.getDataValue("primerApellido") || ""} ${
              o.getDataValue("segundoApellido") || ""
            }`.trim()
          );
          // Guardar los correos de los obreros
          correosObrerosCongregacion = obreros.map((o) =>
            o.getDataValue("email")
          );
        }
      }
    }

    // =======================================================================
    //                Validar que el Login no esté duplicado
    // =======================================================================

    if (login) {
      const existeLogin = await Usuario.findOne({
        where: {
          login,
          id: { [Op.ne]: usuario_id }, // Excluir al usuario actual
        },
      });

      if (existeLogin) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con el login "${login}".`,
        });
      }
    }

    await eliminarRolesusuario(usuario_id, transaction);

    // =======================================================================
    //             Crear o Actualizar Credenciales del Usuario
    // =======================================================================

    const usuarioLogin = usuario.getDataValue("login");
    const usuarioPassword = usuario.getDataValue("password");
    let mensajeCorreo: string;

    if (!usuarioLogin || !usuarioPassword) {
      // Crear nuevas credenciales
      const salt = bcrypt.genSaltSync();
      const hashedPassword = bcrypt.hashSync(password, salt);

      await Usuario.update(
        { login, password: hashedPassword },
        {
          where: { id: usuario_id },
          transaction,
        }
      );

      mensajeCorreo = `<p><b>Credenciales de ingreso:</b></p>
                        <ul style="list-style: none">
                          <li>
                            <b>Link de Acceso:&nbsp; </b> <a href="${urlCmarLive}">cmar.live</a>
                          </li>
                          <li><b>Usuario:&nbsp; </b> ${login}</li>
                          <li><b>Contraseña:&nbsp;</b> ${password}</li>
                          <li><b>Tiempo de aprobación:&nbsp;</b> ${formattedTiempoAprobacion}</li>
                        </ul>`;
    } else {
      // Mantener las credenciales existentes
      mensajeCorreo = `
                      <h4>Información importante sobre sus credenciales</h4>
                      <p>
                        Nos complace informarle que sus credenciales de acceso se mantienen sin cambios, ya que ya dispone de un usuario registrado en nuestra plataforma.
                      </p>
                      <ul>
                        <li><b>Usuario:</b> ${usuarioLogin}</li>
                        <li><b>Tiempo de aprobación:&nbsp;</b> ${formattedTiempoAprobacion}</li>
                      </ul>
                      <p>
                        En caso de no recordar su contraseña, puede restablecerla fácilmente seleccionando la opción <b>"Olvidé mi contraseña"</b> en la plataforma.
                      </p>
                    `;
    }

    // =======================================================================
    //                Actualizar Solicitud y Asignar Permisos
    // =======================================================================

    await SolicitudMultimedia.update(
      {
        tiempoAprobacion: tiempoAprobacionDate,
        usuarioQueAprobo_id,
        estado: SOLICITUD_MULTIMEDIA_ENUM.APROBADA,
      },
      {
        where: { id: solicitud_id },
        transaction,
      }
    );

    await UsuarioPermiso.create(
      {
        usuario_id,
        permiso_id: ROLES_ID.MULTIMEDIA,
      },
      { transaction }
    );

    await auditoriaUsuario(
      usuario_id,
      Number(usuarioQueAprobo_id),
      AUDITORIAUSUARIO_ENUM.APROBAR_SOLICITUD,
      transaction
    );

    await transaction.commit();

    // =======================================================================
    //                          Correo Electrónico
    // =======================================================================

    // Enviar correo electrónico
    const templatePath = path.join(
      __dirname,
      "../templates/accesoCmarLive.html"
    );
    const emailTemplate = fs.readFileSync(templatePath, "utf8");

    const personalizarEmail = emailTemplate
      .replace("{{imagenEmail}}", imagenEmail)
      .replace("{{nombre}}", nombre)
      .replace("{{mensaje}}", mensajeCorreo);

    await enviarEmail(email, "Bienvenido(a) a CMAR LIVE", personalizarEmail);

    // Enviar correo electrónico 2
    const templatePathObrero = path.join(
      __dirname,
      "../templates/accesoCmarLiveObrero.html"
    );
    const emailTemplateObrero = fs.readFileSync(templatePathObrero, "utf8");

    if (
      nombreObrerosCongregacion.length > 0 &&
      correosObrerosCongregacion.length > 0
    ) {
      for (let i = 0; i < nombreObrerosCongregacion.length; i++) {
        const personalizarEmailObrero = emailTemplateObrero
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombre}}", nombreObrerosCongregacion[i])
          .replace("{{hermanito}}", nombre)
          .replace("{{tiempoAprobacion}}", formattedTiempoAprobacion)
          .replace("{{congregacion}}", nombreObrerosCongregacion[i]);

        await enviarEmail(
          correosObrerosCongregacion[i],
          "Acceso a CMAR LIVE",
          personalizarEmailObrero
        );
      }
    }

    res.json({
      ok: true,
      msg: "Acceso Multimedia creado correctamente.",
      solicitud,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Error al crear el acceso multimedia. Comuníquese con el administrador.",
      error,
    });
  }
};

export const crearAccesoCongregacionMultimedia = async (
  req: Request,
  res: Response
) => {
  const { body } = req;
  const { email, password, idCongregacion } = req.body;

  let nombre: string = "";
  let correo: string = "";

  const transaction = await db.transaction();

  // =======================================================================
  //                          Validaciones
  // =======================================================================
  try {
    if (email) {
      const existeLogin = await Usuario.findOne({
        where: {
          login: email,
        },
        transaction,
      });

      if (existeLogin) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe la cuenta de usuario ${email}`,
        });
      }
    }

    const congregacion = await Congregacion.findByPk(idCongregacion, {
      transaction,
    });

    if (!congregacion) {
      return res.status(400).json({
        ok: false,
        msg: `No se encuentra la congregación ${idCongregacion}`,
      });
    }

    // =======================================================================
    //               Actualizar Información de congregación
    // =======================================================================

    // Encriptar contraseña
    let hashedPassword = password;

    if (password) {
      const salt = bcrypt.genSaltSync();
      hashedPassword = bcrypt.hashSync(password, salt);
    }

    const [updatedRows] = await Congregacion.update(
      { email, password: hashedPassword },
      {
        where: { id: idCongregacion },
        transaction,
      }
    );

    if (updatedRows === 0) {
      throw new Error("La actualización de la congregación falló");
    }

    const congregacionActualizada = await Congregacion.findByPk(
      idCongregacion,
      { transaction }
    );
    if (congregacionActualizada) {
      await transaction.commit();

      const nombre = congregacionActualizada.getDataValue("congregacion");
      const correo = congregacionActualizada.getDataValue("email");

      // =======================================================================
      //                          Correo Electrónico
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
                    <h3>Bienvenido(a) a CMAR LIVE</h3>
                    <p>Congregación de ${nombre}</p>
                    <p>
                      Le damos la bienvenida a <b>CMAR LIVE</b> donde podrá disfrutar de los servicios,
                      vigilias y eventos especiales de la Congregación Mita.
                    </p>
                  
                    <div>
                      <p><b>Credenciales de ingreso:</b></p>
                      <ul style="list-style: none">
                        <li>
                          <b>Link de Acceso:&nbsp; </b> <a href="${urlCmarLive}">cmar.live</a>
                        </li>
                        <li><b>Usuario:&nbsp; </b> ${correo}</li>
                        <li><b>Contraseña:&nbsp;</b> ${password}</li>                       
                      </ul>
                  
                      <p>
                        Recuerde que estas credenciales son personales, para uso único y exclusivo
                        del beneficiario solicitante; si notamos un uso inadecuado de la cuenta
                        aprobada, nos veremos en la necesidad de cancelar su acceso a la
                        plataforma indefinidamente.
                      </p>
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
                      Cordialmente,
                      <br />
                      <b>Congregación Mita, Inc.</b>
                    </div>
                  </div>`;

      await enviarEmail(email, "Bienvenido(a) a CMAR LIVE", html);
    }

    res.json({
      ok: true,
      msg: "Acceso Multimedia creado ",
      congregacion: congregacionActualizada,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const denegarSolicitudMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const { solicitud_id, motivoDeNegacion } = req.body;

  const transaction = await db.transaction();

  try {
    // Buscar la solicitud
    const solicitud = await SolicitudMultimedia.findByPk(solicitud_id);

    if (!solicitud) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe la solicitud con el id ${solicitud_id}`,
      });
    }

    // Buscar al usuario relacionado directamente
    const usuarioId = solicitud.getDataValue("usuario_id");

    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: [
        "email",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
      ],
    });

    if (!usuario) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No se encontró el usuario asociado a la solicitud con ID ${solicitud_id}`,
      });
    }

    await eliminarRolesusuario(usuarioId, transaction);

    const email = usuario.getDataValue("email");
    if (!email) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        msg: "El usuario asociado a la solicitud no tiene un correo electrónico válido.",
      });
    }

    // Actualizar la solicitud como denegada
    solicitud.set({
      motivoDeNegacion,
      tiempoAprobacion: null,
      estado: SOLICITUD_MULTIMEDIA_ENUM.DENEGADA,
      usuarioQueAprobo_id: req.id,
    });

    await solicitud.save({ transaction });

    await transaction.commit();

    // Enviar correo electrónico
    const templatePath = path.join(
      __dirname,
      "../templates/solicitudDenegada.html"
    );
    const emailTemplate = fs.readFileSync(templatePath, "utf8");

    const nombre = `${usuario.get("primerNombre") || ""} ${
      usuario.get("segundoNombre") || ""
    } ${usuario.get("primerApellido") || ""} ${
      usuario.get("segundoApellido") || ""
    }`.trim();

    const personalizarEmail = emailTemplate
      .replace("{{imagenEmail}}", imagenEmail)
      .replace("{{nombre}}", nombre)
      .replace("{{solicitudId}}", solicitud_id)
      .replace("{{motivoDeNegacion}}", motivoDeNegacion);

    await enviarEmail(email, "Solicitud Denegada", personalizarEmail);

    return res.status(200).json({
      ok: true,
      msg: "Solicitud denegada correctamente y correo enviado",
      solicitud,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al denegar la solicitud:", error);
    return res.status(500).json({
      ok: false,
      msg: "Hubo un error al denegar la solicitud.",
    });
  }
};

export const eliminarSolicitudMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const transaction = await db.transaction();

  const { id } = req.params;

  const idSolicitud = req.params.id;
  const motivoDeNegacion = "Solicitud eliminada";

  try {
    // Buscar la solicitud
    const solicitud = await SolicitudMultimedia.findByPk(idSolicitud);

    if (!solicitud) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe la solicitud con el id ${idSolicitud}`,
      });
    }

    // Actualizar la solicitud como eliminada
    solicitud.set({
      motivoDeNegacion,
      tiempoAprobacion: null,
      estado: SOLICITUD_MULTIMEDIA_ENUM.ELIMINADA,
      usuarioQueAprobo_id: req.id,
    });

    await auditoriaUsuario(
      solicitud.getDataValue("usuario_id"),
      Number(req.id),
      AUDITORIAUSUARIO_ENUM.ELIMINAR_SOLICITUD,
      transaction
    );

    await solicitud.save({ transaction });

    await transaction.commit();

    return res.status(200).json({
      ok: true,
      msg: "Solicitud denegada correctamente y correo enviado",
      solicitud,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error al denegar la solicitud:", error);
    return res.status(500).json({
      ok: false,
      msg: "Hubo un error al denegar la solicitud.",
    });
  }
};

const eliminarRolesusuario = async (usuarioId: number, transaction?: any) => {
  // Verificar permisos del usuario
  const permisos = await UsuarioPermiso.findAll({
    where: { usuario_id: usuarioId },
    attributes: ["permiso_id"],
    transaction,
  });

  // Si no tiene permisos, no hacer nada
  if (!permisos.length)
    return { ok: true, msg: "El usuario no tiene permisos." };

  const permisoIds = permisos.map((permiso) =>
    permiso.getDataValue("permiso_id")
  );

  if (permisoIds.includes(Number(ROLES_ID.MULTIMEDIA))) {
    if (permisoIds.length > 1) {
      // Eliminar solo el permiso 6 (MULTIMEDIA)
      await UsuarioPermiso.destroy({
        where: {
          usuario_id: usuarioId,
          permiso_id: Number(ROLES_ID.MULTIMEDIA),
        },
        transaction,
      });
      await Usuario.update(
        { login: null, password: null },
        { where: { id: usuarioId }, transaction }
      );
      console.log(
        `Permiso MULTIMEDIA eliminado y credenciales del usuario ID ${usuarioId} actualizadas.`
      );
      return { ok: true, msg: "Permiso MULTIMEDIA y credenciales eliminados." };
    } else {
      // Tiene MULTIMEDIA y otros: eliminar solo MULTIMEDIA
      await UsuarioPermiso.destroy({
        where: {
          usuario_id: usuarioId,
          permiso_id: Number(ROLES_ID.MULTIMEDIA),
        },
        transaction,
      });
      console.log(`Permiso MULTIMEDIA eliminado del usuario ID ${usuarioId}.`);

      return { ok: true, msg: "Permiso MULTIMEDIA eliminado." };
    }
  }
  // Si no tiene MULTIMEDIA, no hacer nada
  console.log("No se eliminó ningún permiso.");
  return { ok: true, msg: "No se eliminó ningún permiso." };
};
