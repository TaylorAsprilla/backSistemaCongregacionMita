import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import generarJWT from "../helpers/tokenJwt";
import { CustomRequest } from "../middlewares/validar-jwt";
import AccesoMultimedia from "../models/accesoMultimedia.model";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import enviarEmail from "../helpers/email";
import config from "../config/config";
import Usuario from "../models/usuario.model";
import { getSolicitudesMultimedia } from "./solicitudMultimedia.controllers";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import { ROLES_ID } from "../enum/roles.enum";
import db from "../database/connection";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;
const urlCmarLive = environment.urlCmarLive;

export const crearAccesoMultimedia = async (req: Request, res: Response) => {
  const { body } = req;
  const { login, password, solicitud_id, tiempoAprobacion, estado } = req.body;

  let nombre: string = "";
  let email: string = "";

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
          msg: `Ya existe un usuario con el login ${login}`,
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

    await UsuarioPermiso.create(
      {
        usuario_id: usuario_id,
        permiso_id: ROLES_ID.MULTIMEDIA,
      },
      { transaction }
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

      // =======================================================================
      //                          Correo Electrónico
      // =======================================================================
      console.log("Enviar correo");
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
                        style="text-align: center; width: 200px"
                      />
                    </div>
                    <h3>Bienvenido(a) a CMAR LIVE</h3>
                    <p>Hola, ${nombre}</p>
                    <p>
                      Le damos la bienvenida a CMAR LIVE donde podrá disfrutar de los servicios,
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
                        <a href="mailto:multimedia@congregacionmita.com">
                          multimedia@congregacionmita.com</a
                        >
                      </p>
                  
                      <br />
                      <b>Congregación Mita, Inc.</b>
                    </div>
                  </div>`;

      enviarEmail(email, "Bienvenido(a) a CMAR LIVE", html);

      await transaction.commit();
    }

    res.json({
      ok: true,
      msg: "Acceso Multimedia creado ",
      solicitud: existeSolicitud,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarAccesoMultimedia = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;
  const { password, login, ...campos } = body;

  try {
    const accesoMultimedia = await AccesoMultimedia.findByPk(id);
    if (!accesoMultimedia) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un usuario con el id ${id}`,
      });
    }

    const getLogin = await accesoMultimedia.get().login;

    // =======================================================================
    //                          Actualizar Usuario
    // =======================================================================

    if (getLogin !== login) {
      const existeLogin = await AccesoMultimedia.findOne({
        where: {
          login: login,
        },
      });
      if (existeLogin) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con el login ${login}`,
        });
      }
    }

    // Encriptar contraseña
    if (password) {
      const salt = bcrypt.genSaltSync();
      campos.password = await bcrypt.hashSync(password, salt);
    }

    campos.login = await login;

    const accesoActualizado = await accesoMultimedia.update(campos, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Acceso a CMAR Live Actualizado",
      accesoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarAccesoMultimedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const accesoMultimedia = await AccesoMultimedia.findByPk(id);
    if (accesoMultimedia) {
      await accesoMultimedia.update({ estado: false });

      res.json({
        ok: true,
        msg: `Se eliminó el acceso de CMAR Live del usuario ${
          accesoMultimedia.get().nombre
        }`,
        id,
        accesoMultimedia,
      });
    }

    if (!accesoMultimedia) {
      return res.status(404).json({
        msg: `No existe un usuario con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};

export const activarAccesoMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const solicitudMultimedia = await SolicitudMultimedia.findByPk(id);

    if (!solicitudMultimedia) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una solicitud de acceso multimedia con el id ${id}`,
      });
    }

    const usuario_id = solicitudMultimedia.getDataValue("usuario_id");
    const usuario = await Usuario.findByPk(usuario_id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un usuario asociado a la solicitud de acceso multimedia con el id ${id}`,
      });
    }

    const nombre = `${usuario.getDataValue("primerNombre") || ""} ${
      usuario.getDataValue("segundoNombre") || ""
    } ${usuario.getDataValue("primerApellido") || ""} ${
      usuario.getDataValue("segundoApellido") || ""
    }`;

    if (solicitudMultimedia.get().estado === false) {
      await solicitudMultimedia.update({ estado: true });
      res.json({
        ok: true,
        msg: `El acceso a CMAR Live de ${nombre} se activó`,
        accesoMultimedia: solicitudMultimedia,
        id: req.id,
      });
    } else {
      return res.status(404).json({
        ok: false,
        msg: `El acceso a CMAR Live de ${nombre} ya está activo`,
        accesoMultimedia: solicitudMultimedia,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
