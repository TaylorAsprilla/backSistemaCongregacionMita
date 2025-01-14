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

const environment = config[process.env.NODE_ENV || "development"];

const imagenEmail = environment.imagenEmail;
const urlCmarLive = environment.urlCmarLive;

export const crearAccesoMultimedia = async (req: Request, res: Response) => {
  const { body } = req;
  const {
    login,
    password,
    solicitud_id,
    tiempoAprobacion,
    usuarioQueAprobo_id,
  } = req.body;

  let nombre: string = "";
  let email: string = "";
  let tiempoAprobacionDate = new Date(tiempoAprobacion);

  const transaction = await db.transaction();

  // =======================================================================
  //                          Validaciones
  // =======================================================================
  try {
    const existeSolicitud = await SolicitudMultimedia.findByPk(solicitud_id);

    if (!existeSolicitud) {
      return res.status(400).json({
        ok: false,
        msg: `No existe una solicitud diligenciada para el usuario ID: ${solicitud_id}`,
      });
    }

    if (login) {
      const existeLogin = await Usuario.findOne({
        where: {
          login: login,
        },
        transaction,
      });

      if (existeLogin) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con el login <b>${login}</b>`,
        });
      }
    }

    // =======================================================================
    //                          Guardar Usuario
    // =======================================================================

    // Encriptar contraseña
    if (password) {
      const salt = bcrypt.genSaltSync();
      body.password = bcrypt.hashSync(password, salt);
    }

    const usuario_id = existeSolicitud.getDataValue("usuario_id");

    await Usuario.update(
      { login, password: body.password },
      {
        where: {
          id: usuario_id,
        },
        transaction,
      }
    );

    const actualizado = await SolicitudMultimedia.update(
      {
        tiempoAprobacion: tiempoAprobacionDate,
        usuarioQueAprobo_id,
        estado: SOLICITUD_MULTIMEDIA_ENUM.APROBADA,
      },
      {
        where: {
          usuario_id,
        },

        transaction,
      }
    );

    await UsuarioPermiso.create(
      {
        usuario_id: usuario_id,
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

    const usuario = await Usuario.findByPk(usuario_id, { transaction });

    if (!usuario) {
      return res.status(400).json({
        ok: false,
        msg: `No existe un usuario con el ${usuario_id}`,
      });
    }

    if (usuario) {
      nombre = `
      ${usuario.getDataValue("primerNombre")} 
      ${usuario.getDataValue("segundoNombre")} 
      ${usuario.getDataValue("primerApellido")} 
      ${usuario.getDataValue("segundoApellido")}
      `;

      email = usuario.getDataValue("email");

      await transaction.commit();
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
                    <p>Hola, ${nombre}</p>
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
                        <li><b>Usuario:&nbsp; </b> ${login}</li>
                        <li><b>Contraseña:&nbsp;</b> ${password}</li>
                        <li><b>Tiempo de aprobación:&nbsp;</b> ${tiempoAprobacion}</li>
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
      solicitud: existeSolicitud,
      actualizado,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      msg: "Hable con el administrador",
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
    const usuario = await Usuario.findByPk(
      solicitud.getDataValue("usuario_id"),
      {
        attributes: [
          "email",
          "primerNombre",
          "segundoNombre",
          "primerApellido",
          "segundoApellido",
        ],
      }
    );

    if (!usuario) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No se encontró el usuario asociado a la solicitud con ID ${solicitud_id}`,
      });
    }

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
