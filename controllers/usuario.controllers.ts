import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import { CustomRequest } from "../middlewares/validar-jwt";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import UsuarioFuenteIngreso from "../models/usuarioFuenteIngreso.model";

import config from "../config/config";
import enviarEmail from "../helpers/email";
import { Op } from "sequelize";
import db from "../database/connection";
require("./../database/associations");

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

export const getUsuarios = async (req: Request, res: Response) => {
  const desde = Number(req.query.desde) || 0;

  const [usuarios, totalUsuarios] = await Promise.all([
    Usuario.findAll({
      include: [
        {
          all: true,
        },
      ],
      offset: desde,
      limit: 50,
      order: ["id"],
    }),
    Usuario.count(),
  ]);

  res.json({
    ok: true,
    usuarios: usuarios,
    totalUsuarios: totalUsuarios,
    msg: "Usuarios Registrados con paginación",
  });
};

export const getTodosLosUsuarios = async (req: Request, res: Response) => {
  const [usuarios, totalUsuarios] = await Promise.all([
    Usuario.findAll({
      include: [
        {
          all: true,
        },
      ],
    }),
    Usuario.count(),
  ]);

  res.json({
    ok: true,
    usuarios,
    totalUsuarios,
    msg: "Todos los usuarios Registrados",
  });
};

export const getUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  const usuario = await Usuario.findByPk(id, {
    include: [
      {
        all: true,
        required: false,
      },
    ],
  });

  if (usuario) {
    res.json({
      ok: true,
      usuario,
      msg: "getUsuarios",
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe el usuario con el id ${id}`,
    });
  }
};

export const crearUsuario = async (req: Request, res: Response) => {
  const { body } = req;
  const {
    email,
    password,
    numeroDocumento,
    login,
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
  } = req.body;

  let id: number = 0;

  // =======================================================================
  //                          Validaciones
  // =======================================================================

  const existeEmail = await Usuario.findOne({
    where: {
      email: email,
    },
  });

  if (existeEmail) {
    return res.status(400).json({
      ok: false,
      msg: `Ya existe un usuario con el email ${email}`,
    });
  }

  if (numeroDocumento) {
    const existeDocumento = await Usuario.findOne({
      where: {
        numeroDocumento: numeroDocumento,
      },
    });

    if (existeDocumento) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe un usuario con el número de documento ${numeroDocumento}`,
      });
    }
  }

  if (!!login) {
    const existeLogin = await Usuario.findOne({
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

  // =======================================================================
  //                          Guardar Usuario
  // =======================================================================

  // Encriptar contraseña
  if (password) {
    const salt = bcrypt.genSaltSync();
    body.password = bcrypt.hashSync(password, salt);
  }
  try {
    const results = await db.query(
      `CALL insertar_usuario(:p_usuario, @idUsuario)`,
      {
        replacements: {
          p_usuario: JSON.stringify(body),
        },
      }
    );

    const [idUsuario] = await db.query("SELECT @idUsuario");
    id = (idUsuario as { "@idUsuario": number }[])[0]["@idUsuario"];

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
          <p>
            Hola, ${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}
          </p>
          <p>Le damos la bienvenida al censo de la Congregación Mita.</p>
        
          <p>Su código Mita es ${id}</p>
        
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
        </div>`;

    enviarEmail(email, "Bienvenido al censo de la Congregación Mita", html);

    res.status(201).json({
      ok: true,
      id,
      msg: `Se creó el usuario correctamente, ${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}, con el número Mita ${id}`,
      results,
    });
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const actualizarUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;
  const {
    password,
    email,
    numeroDocumento,
    login,
    numeroCelular,
    direcciones,
    fuentesDeIngreso,
    ministerios,
    voluntariados,
    congregacion,
    ...campos
  } = body;

  let usuarioActualizado;
  let getEmail: any;
  let getNumeroCelular: string;
  let getLogin: string;
  let getNumeroDocumento: string;
  let idUsuario: number;
  let usuarioCongregacion: any;
  let usuarioFuenteIngreso: any;

  const usuario = await Usuario.findByPk(id);

  if (!usuario) {
    return res.status(404).json({
      ok: false,
      msg: `No existe un usuario con el id ${id}`,
    });
  }

  getEmail = await usuario.get().email;
  getNumeroCelular = await usuario.get().numeroCelular;
  getLogin = await usuario.get().login;
  getNumeroDocumento = await usuario.get().numeroDocumento;
  idUsuario = await usuario.get().id;

  // =======================================================================
  //                          Actualizar Usuario
  // =======================================================================

  if (!!email && getEmail !== email) {
    const existeEmail = await Usuario.findOne({
      where: {
        email: email,
        someAttribute: {
          [Op.ne]: [
            {
              id: idUsuario,
            },
          ],
        },
      },
    });

    if (existeEmail) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe un usuario con este email ${email}`,
      });
    }
  }

  if (!!numeroDocumento && getNumeroDocumento !== numeroDocumento.toString()) {
    const existeNumeroDocumento = await Usuario.findOne({
      where: {
        numeroDocumento: numeroDocumento,
      },
    });
    if (existeNumeroDocumento) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe un usuario con este Número de Documento ${numeroDocumento}`,
      });
    }
  }

  if (!!numeroCelular && getNumeroCelular !== numeroCelular) {
    const existeNumeroCelular = await Usuario.findOne({
      where: {
        numeroCelular: numeroCelular,
      },
    });
    if (existeNumeroCelular) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe un usuario con este Número de Celular ${numeroCelular}`,
      });
    }
  }

  if (!!login && getLogin !== login) {
    const existeLogin = await Usuario.findOne({
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

  try {
    // Encriptar contraseña
    if (!!password) {
      const salt = bcrypt.genSaltSync();
      campos.password = await bcrypt.hashSync(password, salt);
    }

    campos.email = await email;
    campos.numeroDocumento = await numeroDocumento;
    campos.numeroCelular = await numeroCelular;
    campos.login = await login;

    usuarioActualizado = await usuario.update(campos, { new: true });
  } catch (error) {
    res.status(404).json({
      ok: false,
      msg: "Hable con el administrador, no se logró actualizar el usuario",
      error,
    });
  }

  try {
    usuarioCongregacion = await UsuarioCongregacion.update(
      {
        usuario_id: idUsuario,
        pais_id: congregacion.pais_id,
        congregacion_id: congregacion.congregacion_id
          ? congregacion.congregacion_id
          : config.sinCongregacion,
        campo_id: congregacion.campo_id
          ? congregacion.campo_id
          : config.sinCampo,
      },
      {
        where: {
          usuario_id: idUsuario,
        },
      }
    );
  } catch (error) {
    res.status(404).json({
      ok: false,
      msg: "Hable con el administrador, no se actualizó la tabla usuarioCongregacion",
      error,
    });
  }

  if (!!fuentesDeIngreso) {
    try {
      await UsuarioFuenteIngreso.destroy({
        where: {
          usuario_id: idUsuario,
        },
      });
    } catch (error) {
      res.status(404).json({
        ok: false,
        msg: "Hable con el administrador, no se borró las fuentes de ingreso para la actualización",
        error,
      });

      try {
        usuarioFuenteIngreso = await fuentesDeIngreso.map(
          (itemIngreso: any) => {
            return {
              fuenteIngreso_id: itemIngreso,
              usuario_id: idUsuario,
            };
          }
        );

        await UsuarioFuenteIngreso.bulkCreate(usuarioFuenteIngreso, {
          updateOnDuplicate: ["fuenteIngreso_id", "usuario_id"],
        });
      } catch (error) {
        res.status(404).json({
          ok: false,
          msg: "Hable con el administrador, no se actualizó la tabla usuarioCongregacion",
          error,
        });
      }
    }

    res.json({
      ok: true,
      msg: "Usuario Actualizado",
      usuario: usuarioActualizado,
      congregacion: usuarioCongregacion,
    });
  }
};

export const eliminarUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const usuario = await Usuario.findByPk(id);
    if (usuario) {
      await usuario.update({ estado: false });

      res.json({
        ok: true,
        msg: `Se elminó el usuario ${id}`,
        id,
        usuario,
      });
    }

    if (!usuario) {
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

export const activarUsuario = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!!usuario) {
      const primerNombre = await usuario.get().primerNombre;
      const segundoNombre = await usuario.get().segundoNombre;
      const primerApellido = await usuario.get().primerApellido;

      if (usuario.get().estado === false) {
        await usuario.update({ estado: true });
        res.json({
          ok: true,
          msg: `El usuario ${primerNombre} ${segundoNombre} ${primerApellido} se activó`,
          usuario,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El usuario ${primerNombre} ${segundoNombre} ${primerApellido} esta activo`,
          usuario,
        });
      }
    }

    if (!usuario) {
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

export const buscarCorreoElectronico = async (req: Request, res: Response) => {
  const email = req.params.email;
  if (!email) {
    res.status(500).json({
      ok: false,
      msg: `No existe parametro en la petición`,
    });
  } else {
    try {
      const correoElectronico = await Usuario.findOne({
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

export const buscarCelular = async (req: Request, res: Response) => {
  const numeroCelular = req.query.numeroCelular;
  if (!numeroCelular) {
    res.status(500).json({
      ok: false,
      msg: `No existe parametro en la petición`,
    });
  } else {
    try {
      const numeroCelularEncontrado = await Usuario.findOne({
        attributes: ["numeroCelular"],
        where: {
          numeroCelular: `+${numeroCelular}`,
        },
      });
      if (!!numeroCelularEncontrado) {
        res.json({
          ok: false,
          msg: `Ya se encuentra registrado el número de celular ${numeroCelular}`,
        });
      } else {
        res.json({
          ok: true,
          msg: `Número de celular válido`,
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
