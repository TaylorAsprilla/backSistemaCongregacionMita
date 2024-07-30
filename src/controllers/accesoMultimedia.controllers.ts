import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { CustomRequest } from "../middlewares/validar-jwt";
import AccesoMultimedia from "../models/accesoMultimedia.model";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import enviarEmail from "../helpers/email";
import config from "../config/config";
import Usuario from "../models/usuario.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import { ROLES_ID } from "../enum/roles.enum";
import db from "../database/connection";
import Congregacion from "../models/congregacion.model";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;
const urlCmarLive = environment.urlCmarLive;

export const crearAccesoMultimedia = async (req: Request, res: Response) => {
  const { body } = req;
  const { login, password, solicitud_id, tiempoAprobacion } = req.body;

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

    const actualizado = await SolicitudMultimedia.update(
      { tiempoAprobacion: tiempoAprobacionDate },
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
