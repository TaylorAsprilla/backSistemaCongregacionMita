import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import generarJWT from "../helpers/tokenJwt";
import { CustomRequest } from "../middlewares/validar-jwt";
import AccesoMultimedia from "../models/accesoMultimedia.model";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import enviarEmail from "../helpers/email";
import config from "../config/config";

const environment = config[process.env.NODE_ENV || "development"];
const urlDeValidacion = environment.urlDeValidacion;
const imagenEmail = environment.imagenEmail;
const urlCmarLive = environment.urlCmarLive;

export const loginMultimedia = async (req: Request, res: Response) => {
  const { login, password } = req.body;
  try {
    // Verificar Usuario
    const loginUsuarioCmarLive = await AccesoMultimedia.findOne({
      where: {
        login: login,
      },
    });

    if (!loginUsuarioCmarLive?.getDataValue("estado")) {
      return res.status(404).json({
        ok: false,
        msg: "Este usuario no esta activo, por favor contáctese con el obrero más cercano",
      });
    }
    if (!loginUsuarioCmarLive) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no válido",
      });
    }

    // Verificar contraseña

    const validarPassword = bcrypt.compareSync(
      password,
      loginUsuarioCmarLive.getDataValue("password")
    );

    if (!validarPassword) {
      return res.status(404).json({
        ok: false,
        msg: "Contraseña no válida",
      });
    }

    // Generar Token - JWT
    const token = await generarJWT(
      loginUsuarioCmarLive.getDataValue("id"),
      loginUsuarioCmarLive.getDataValue("login")
    );

    const datosUsuario = await SolicitudMultimedia.findByPk(
      loginUsuarioCmarLive.getDataValue("solicitud_id")
    );

    res.json({
      ok: true,
      token,
      loginUsuarioCmarLive,
      usuario: datosUsuario,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearAccesoMultimedia = async (req: Request, res: Response) => {
  const { body } = req;
  const { login, password, solicitud_id, tiempoAprobacion, estado } = req.body;

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
    } else {
      if (!!login) {
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
    }

    // =======================================================================
    //                          Guardar Usuario
    // =======================================================================

    // Encriptar contraseña
    if (password) {
      const salt = bcrypt.genSaltSync();
      body.password = bcrypt.hashSync(password, salt);
    }

    const accesoMultimedia = AccesoMultimedia.build(body);
    await accesoMultimedia.save();

    const idUsuario = await accesoMultimedia.getDataValue("id");

    const loginAcceso = await accesoMultimedia.getDataValue("login");

    const usuario = await SolicitudMultimedia.findByPk(solicitud_id);

    if (!!usuario && !!loginAcceso) {
      // Generar Token - JWT
      const token = await generarJWT(accesoMultimedia.getDataValue("id"));
      const nombre = await usuario.getDataValue("nombre");

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
                style="text-align: center; width: 200px"
              />
            </div>
            <h3>Bienvenido(a) a CMAR LIVE</h3>
            <p>Hola, ${nombre} </p>
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
                <li><b>Usuario:&nbsp; </b> ${loginAcceso}</li>
                <li><b>Contraseña:&nbsp;</b> ${password}</li>
                <li><b>Tiempo de aprobación:&nbsp;</b> ${tiempoAprobacion}</li>
              </ul>
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
              <b>Congregación Mita Inc</b>
            </div>
          </div>`;

      enviarEmail(usuario.getDataValue("email"), "Acceso a CMAR LIVE", html);

      res.json({
        ok: true,
        msg: "Acceso Multimedia creado ",
        accesoMultimedia,
      });
    }
  } catch (error) {
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
  const { body } = req;

  try {
    const accesoMultimedia = await AccesoMultimedia.findByPk(id);
    if (!!accesoMultimedia) {
      const nombre = await accesoMultimedia.get().nombre;

      if (accesoMultimedia.get().estado === false) {
        await accesoMultimedia.update({ estado: true });
        res.json({
          ok: true,
          msg: `El acceso a CMAR Live de ${nombre}  se activó`,
          accesoMultimedia,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El acceso a CMAR Live de ${nombre} está activo`,
          accesoMultimedia,
        });
      }
    }

    if (!accesoMultimedia) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un usuario con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
