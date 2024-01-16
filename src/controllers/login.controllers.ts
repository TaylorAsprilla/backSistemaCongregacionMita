import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import generarJWT from "../helpers/tokenJwt";
import { CustomRequest } from "../middlewares/validar-jwt";
import config from "../config/config";
import * as jwt from "jsonwebtoken";
import enviarEmail from "../helpers/email";
import { Op } from "sequelize";
import generarPassword from "../helpers/generarPassword";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import { ROLES_ID } from "../enum/roles.enum";
import Congregacion from "../models/congregacion.model";
import Campo from "../models/campo.model";
import { obtenerUbicacionPorIP } from "../helpers/obtenerDireccionIp";
import UbicacionConexion from "../models/ubicacionConexion.model";
import DeviceDetector from "device-detector-js";
import { BrowserResult } from "device-detector-js/dist/parsers/client/browser";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;
const urlCmarLive = environment.urlCmarLive;

export const login = async (req: Request, res: Response) => {
  const { login, password } = req.body;
  const ipAddress = environment.ip || req.ip;
  const userAgent = req.headers["user-agent"] || "";

  try {
    const loginUsuario = await verificarUsuario(login);

    if (!loginUsuario) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no válido",
      });
    }

    const isValidPassword = await verificarPassword(
      password,
      loginUsuario.getDataValue("password")
    );

    if (!isValidPassword) {
      return res.status(404).json({
        ok: false,
        msg: "Contraseña no válida",
      });
    }

    const token = await generarJWT(
      loginUsuario.getDataValue("id"),
      loginUsuario.getDataValue("login")
    );

    try {
      await guardarInformacionConexion(ipAddress, userAgent, loginUsuario);
    } catch (error) {
      console.error("Error al guardar información de conexión:", error);
    }

    res.json({
      ok: true,
      token: token,
      usuario: loginUsuario,
    });
  } catch (error) {
    console.error("Error al realizar el inicio de sesión:", error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const renewToken = async (req: CustomRequest, res: Response) => {
  const idUsuario = req.id;

  const { body } = req;
  let usuario;
  let usuarioID;
  let token;
  let buscarUsuario;

  buscarUsuario = await Usuario.findByPk(idUsuario);

  if (buscarUsuario) {
    usuario = Usuario.build(body);

    token = await generarJWT(idUsuario, usuario.getDataValue("login"));
    usuarioID = await Usuario.findByPk(idUsuario, {
      include: [
        {
          all: true,
          required: false,
        },
      ],
    });
  }

  res.json({
    ok: true,
    token,
    usuario: usuarioID,
  });
};

export const crearLogin = async (req: Request, res: Response) => {
  const { idUsuario, login, password } = req.body;

  let actualizacionUsuario = {};
  let email: string = "";
  let nombre: string = "";

  try {
    const loginExistente = await verificarUsuario(login);

    if (loginExistente) {
      return res.status(404).json({
        ok: false,
        msg: "Ya existe un usuario con ese nombre de usuario. Por favor, seleccione otro nombre de usuario",
      });
    }

    // Actualiza la contraseña si se proporcionó
    if (login && password) {
      const salt = bcrypt.genSaltSync();
      const hashedPassword = bcrypt.hashSync(password, salt);
      actualizacionUsuario = { login, password: hashedPassword };
    } else {
      actualizacionUsuario = { login };
    }

    // Actualiza el usuario
    const usuarioActualizado = await Usuario.update(actualizacionUsuario, {
      where: { id: idUsuario },
    });

    if (usuarioActualizado[0] === 0) {
      return res.status(404).json({
        ok: false,
        msg: `No se encontró un usuario con el número Mita ${idUsuario}`,
      });
    }

    const usuario = await Usuario.findByPk(idUsuario);
    email = usuario?.getDataValue("email");
    nombre = `${usuario?.getDataValue("primerNombre") || ""} 
    ${usuario?.getDataValue("segundoNombre") || ""}
    ${usuario?.getDataValue("primerApellido") || ""} 
    ${usuario?.getDataValue("segundoApellido") || ""}`;

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
                    <li><b>Usuario:&nbsp; </b> ${email}</li>
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
                    <a href="mailto:multimedia@congregacionmita.com">
                      multimedia@congregacionmita.com</a
                    >
                  </p>
              
                  <br />
                  Cordialmente, <br />
                  <b>Congregación Mita, Inc.</b>
                </div>
              </div>`;

    enviarEmail(email, "Acceso a CMAR Live", html);

    return res.json({
      ok: true,
      msg: "Credenciales actualizadas con éxito",
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar las credenciales:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error al actualizar las credenciales, por favor contacta al administrador",
      error,
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { body } = req;
  const { login } = body;
  const mensaje =
    "Verifique su correo electrónico para obtener el enlace para restablecer su contraseña";

  let verificarLink = environment.verificarLink;
  let emailStatus = "OK";
  let usuario;
  let token: any;
  let email: string = "";
  let nombre: string = "";

  try {
    usuario = await Usuario.findOne({
      where: {
        login: login,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: "Hay un error, verifique su cuenta de usuario",
      });
    }

    token = await generarJWT(
      usuario.getDataValue("id"),
      login,
      "10m",
      environment.jwtSecretReset
    );
    verificarLink = verificarLink + token;
    usuario.getDataValue("resetToken");
    email = await usuario.getDataValue("email");

    const usuarioActualizado = await usuario.update({
      resetToken: token,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }

  if (usuario) {
    nombre = `
      ${usuario.getDataValue("primerNombre")} 
      ${usuario.getDataValue("segundoNombre")} 
      ${usuario.getDataValue("primerApellido")} 
      ${usuario.getDataValue("segundoApellido")}
      `;
  }
  try {
    // Envío de Email
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
              <h3>Restablece tu contraseña</h3>
              <p>Hola, ${nombre}</p>
              <p>
                Has solicitado restablecer tu contraseña y se te ha enviado un correo para
                restablecerla. Haz clic en el siguiente enlace para completar el
                restablecimiento de tu contraseña.
              </p>
            
              <div
                title="Restablecer Contraseña"
                style="text-align: center; margin: 24px 0 40px 0; padding: 0"
              >
                <a
                  href="${verificarLink}"
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
                  Restablecer contraseña
                </a>
              </div>
            
              <p>
                Si el enlace anterior no funciona, introduzca la dirección su navegador.
              </p>
            
              <a href="${verificarLink}">${verificarLink}</a>
            
              <p>
                Este vínculo de restablecimiento de contraseña solo es válido durante 10
                minutos tras la recepción de este correo electrónico. <br />Si no nos has
                pedido restablecer tu contraseña, restablécela ahora para mantener protegida
                la cuenta.
              </p>
            
              <p
                style="
                  margin: 0 0 24px 0;
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
                en contacto con nosotros mediante nuestro correo electrónico <a href="mailto:multimedia@congregacionmita.com">
                  multimedia@congregacionmita.com</a
                >
              </p>
            
                <br />
                <b>Congregación Mita, Inc.</b>
              </p>
            </div>`;
    enviarEmail(email, "Restablece tu contraseña", html);
  } catch (error) {
    emailStatus = "False";
    return res.status(500).json({
      ok: false,
      msg: "No se pudo enviar el correo electrónico",
      error,
    });
  }

  res.json({
    ok: true,
    msg: mensaje,
    token,
    login,
  });
};

export const crearNuevoPassword = async (req: Request, res: Response) => {
  const { body } = req;
  const { nuevoPassword } = body;
  const resetToken = req.header("x-reset") as string;
  let usuario;
  let usuarioActualizado;
  let jwtPayload;

  if (!resetToken && !nuevoPassword) {
    return res.status(404).json({
      ok: false,
      msg: "Todos los campos son requeridos",
    });
  }

  try {
    jwtPayload = jwt.verify(resetToken, environment.jwtSecretReset);
    usuario = await Usuario.findOne({
      where: {
        resetToken,
      },
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      msg: `El vínculo de restablecimiento de contraseña ha <b>expirado.</b>
             Recuerda que el vínculo es válido durante 10 minutos tras la recepción del correo electrónico.</p>
            <p> Por favor vuelva a reestablecer la contraseña</p>`,
      error,
    });
  }

  try {
    if (usuario) {
      const salt = bcrypt.genSaltSync();
      body.password = bcrypt.hashSync(nuevoPassword, salt);

      usuarioActualizado = await usuario.update({
        password: body.password,
      });
    }
  } catch (error) {
    return res.status(404).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
  res.json({
    ok: true,
    msg: "La contraseña se cambió satisfactoriamente",
    usuarioActualizado,
  });
};

export const cambiarPassword = async (req: Request, res: Response) => {
  const { body } = req;
  const { passwordAntiguo, passwordNuevo, idUsuario, login } = body;

  let usuario;
  let usuarioActualizado;
  let password;

  try {
    usuario = await Usuario.findOne({
      where: {
        login: login,
      },
    });
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no válido",
      });
    }
  } catch (error) {
    return res.status(404).json({
      ok: false,
      msg: `No existe el usuario ${login}`,
      error,
    });
  }

  if (!!usuario) {
    const validarPassword = bcrypt.compareSync(
      passwordAntiguo,
      usuario.getDataValue("password")
    );

    if (!validarPassword) {
      return res.status(404).json({
        ok: false,
        msg: "La contraseña antigua no es válida",
      });
    }

    if (usuario && validarPassword) {
      try {
        const salt = bcrypt.genSaltSync();
        password = bcrypt.hashSync(passwordNuevo, salt);

        usuarioActualizado = await usuario.update({
          password,
        });
      } catch (error) {
        return res.status(404).json({
          ok: false,
          msg: "No se cambió la contraseña, hable con el administrador",
          error,
        });
      }
      res.json({
        ok: true,
        msg: "La contraseña se cambió satisfactoriamente",
        usuarioActualizado,
      });
    }
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { body } = req;
  const { passwordNuevo, login } = body;

  try {
    let usuario = await Usuario.findOne({
      where: {
        login: login,
      },
    });
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    const salt = bcrypt.genSaltSync();
    const passwordHash = bcrypt.hashSync(passwordNuevo, salt);

    const usuarioActualizado = await usuario.update({
      password: passwordHash,
    });

    res.json({
      ok: true,
      msg: "La contraseña se cambió satisfactoriamente",
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    return res.status(500).json({
      ok: false,
      msg: "Hubo un problema al cambiar la contraseña",
      error,
    });
  }
};

export const envioDeCredenciales = async (req: Request, res: Response) => {
  const { body } = req;
  let usuarios = [];
  let cantidad;
  let permisosObreroCongregacion: string = ROLES_ID.OBRERO_CIUDAD;
  let permisosObreroCampo: string = ROLES_ID.OBRERO_CAMPO;

  try {
    const { count, rows } = await Usuario.findAndCountAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "email",
        "login",
      ],
      where: {
        login: "",
        email: { [Op.ne]: "" },
      },
    });
    usuarios = rows;
    cantidad = count;
  } catch (error) {
    return res.status(404).json({
      ok: false,
      msg: `Error en la busqueda de usuarios sin login`,
      error,
    });
  }

  if (!!usuarios.length) {
    usuarios.forEach(async (usuario) => {
      let email = usuario.getDataValue("email");
      let login = usuario.getDataValue("login");
      let id = usuario.getDataValue("id");
      let nombre = `
              ${usuario.getDataValue("primerNombre")}
              ${usuario.getDataValue("segundoNombre")}
              ${usuario.getDataValue("primerApellido")}
              ${usuario.getDataValue("segundoApellido")}
              `;

      let obreroEncargadoCongregacion = await Congregacion.findOne({
        where: { idObreroEncargado: id },
      });

      let obreroEncargadoCampo = await Campo.findOne({
        where: { idObreroEncargado: id },
      });

      if (!!email && !login) {
        const salt = bcrypt.genSaltSync();
        const password = generarPassword();
        const passwordEncriptada = bcrypt.hashSync(password, salt);
        try {
          await usuario.update({
            login: email,
            password: passwordEncriptada,
          });
        } catch (error) {
          return res.status(404).json({
            ok: false,
            msg: `Error en la actualización del usuario ${id}`,
            error,
          });
        }

        try {
          // Guarda los permisos
          if (!!obreroEncargadoCongregacion) {
            await UsuarioPermiso.create({
              usuario_id: id,
              permiso_id: permisosObreroCongregacion,
            });
          } else if (!!obreroEncargadoCampo) {
            await UsuarioPermiso.create({
              usuario_id: id,
              permiso_id: permisosObreroCampo,
            });
          }
        } catch (error) {
          return res.status(404).json({
            ok: false,
            msg: `Error al enviar dar permisos al usuario ${id}`,
            error,
          });
        }

        try {
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
                    <li><b>Usuario:&nbsp; </b> ${email}</li>
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
                    <a href="mailto:multimedia@congregacionmita.com">
                      multimedia@congregacionmita.com</a
                    >
                  </p>
              
                  <br />
                  Cordialmente, <br />
                  <b>Congregación Mita, Inc.</b>
                </div>
              </div>`;

          enviarEmail(email, "Registro Exitoso", html);
        } catch (error) {
          return res.status(404).json({
            ok: false,
            msg: `Error al enviar el correo electronico al email ${email}`,
            error,
          });
        }
      }
    });
  }
  res.json({
    cantidad,
    ok: true,
    msg: "Credenciales creadas",
    usuarios,
  });
};

async function verificarUsuario(login: string) {
  return await Usuario.findOne({
    where: {
      login: login,
    },
  });
}

async function verificarPassword(password: string, hashedPassword: string) {
  return bcrypt.compareSync(password, hashedPassword);
}

async function guardarInformacionConexion(
  ipAddress: string,
  userAgent: string,
  loginUsuario: any
) {
  try {
    const deviceDetector = new DeviceDetector();
    const deviceResult = deviceDetector.parse(userAgent);

    const location = await obtenerUbicacionPorIP(ipAddress);

    if (location.status === "success") {
      const ubicacion = {
        ...location,
        userAgent,
        navegador: deviceResult.client?.name || "Desconocido",
        tipoDispositivo: deviceResult.device?.type || "Desconocido",
        dispositivo: deviceResult.device?.model || "Desconocido",
        marca: deviceResult.device?.brand || "Desconocido",
        modelo: deviceResult.device?.model || "Desconocido",
        so: deviceResult.os?.name || "Desconocido",
        version: deviceResult.os?.version || "Desconocido",
        plataforma: deviceResult.os?.platform || "Desconocido",
        motorNavegador:
          deviceResult.client?.type === "browser"
            ? (deviceResult.client as BrowserResult).engine || "Desconocido"
            : "Desconocido",
        idUsuario: loginUsuario.getDataValue("id"),
      };

      await UbicacionConexion.create(ubicacion);
    }
  } catch (error) {
    console.error("Error al obtener la ubicación por IP:", error);
  }
}
