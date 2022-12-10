import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import generarJWT from "../helpers/tokenJwt";
import { CustomRequest } from "../middlewares/validar-jwt";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import Direccion from "../models/direccion.model";
import UsuarioDireccion from "../models/usuarioDireccion.model";
import UsuarioFuenteIngreso from "../models/usuarioFuenteIngreso.model";
import UsuarioMinisterio from "../models/usuarioMinisterio.model";
import UsuarioVoluntariado from "../models/usuarioVoluntariado.model";
import config from "../config/config";
import enviarEmail from "../helpers/email";
require("./../database/associations");

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
      limit: 30,
      order: [["id", "DESC"]],
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
    direcciones,
    fuentesDeIngreso,
    ministerios,
    voluntariados,
    congregacion,
    email,
    password,
    numeroDocumento,
    numeroCelular,
    login,
  } = req.body;

  // =======================================================================
  //                          Validaciones
  // =======================================================================
  try {
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

    const usuario = Usuario.build(body);
    await usuario.save();

    const idUsuario = await usuario.getDataValue("id");

    const primerNombre = await usuario.getDataValue("primerNombre");
    const segundoNombre = await usuario.getDataValue("segundoNombre");
    const primerApellido = await usuario.getDataValue("primerApellido");
    const segundoApellido = await usuario.getDataValue("segundoApellido");

    const usuarioCongregacion = await UsuarioCongregacion.create({
      usuario_id: idUsuario,
      pais_id: congregacion.pais_id,
      congregacion_id: congregacion.congregacion_id
        ? congregacion.congregacion_id
        : config.sinCongregacion,
      campo_id: congregacion.campo_id ? congregacion.campo_id : config.sinCampo,
    });

    const usuarioDireccion = await direcciones.forEach(
      async (itemDireccion: {
        direccion: string;
        pais: string;
        ciudad: string;
        departamento: string;
        codigoPostal: string;
        tipoDireccion_id: number;
      }) => {
        const guardarDireccion = await Direccion.create({
          direccion: itemDireccion.direccion,
          pais: itemDireccion.pais,
          ciudad: itemDireccion.ciudad,
          departamento: itemDireccion.departamento,
          codigoPostal: itemDireccion.codigoPostal,
          tipoDireccion_id: itemDireccion.tipoDireccion_id,
        });

        const usuarioDireccion = await UsuarioDireccion.create({
          usuario_id: idUsuario,
          direccion_id: guardarDireccion.getDataValue("id"),
        });
      }
    );

    const usuarioFuenteIngresos = await fuentesDeIngreso.forEach(
      async (fuenteIngreso: any) => {
        const fuenteDeIngresos = await UsuarioFuenteIngreso.create({
          usuario_id: idUsuario,
          fuenteIngreso_id: fuenteIngreso,
        });
      }
    );

    const guardarMinisterios = await ministerios.forEach(
      async (ministerio: any) => {
        await UsuarioMinisterio.create({
          usuario_id: idUsuario,
          ministerio_id: ministerio,
        });
      }
    );

    const guardarVoluntariados = await voluntariados.forEach(
      async (voluntariado: any) => {
        await UsuarioVoluntariado.create({
          usuario_id: idUsuario,
          voluntariado_id: voluntariado,
        });
      }
    );

    // Generar Token - JWT
    const token = await generarJWT(usuario.getDataValue("id"));

    const html = `
      <div style="text-align: center; font-size: 22px">
      <img
        src="https://kromatest.pw/sistemacmi/assets/images/multimedia.png"
        alt="CMAR Multimedia"
        style="text-align: center; width: 400px"
      />
      <p>Saludos, ${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}</p>
      <p>Su código Mita es ${idUsuario} </p>
      <b>Muchas gracias</b>
     
    
      <p style="margin-top: 2%; font-size: 18px">
        Para mayor información puede contactarse a
        <a href="mailto:multimedia@congregacionmita.com">
          multimedia@congregacionmita.com</a
        >
      </p>
    
      <b class="margin-top:2%">Congregación Mita inc</b>
    </div>`;

    enviarEmail(email, "Bienvenido al censo de la Congregación Mita", html);

    const usuarioNuevo = {
      usuario,
      usuarioCongregacion,
      direcciones,
    };
    res.json({
      ok: true,
      msg: "Usuario creado ",
      token,
      usuarioNuevo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarUsuario = async (req: Request, res: Response) => {
  //TODO Validar token y validar si es el usuario correcto
  const { id } = req.params;
  const { body } = req;
  const { password, email, numeroDocumento, login, numeroCelular, ...campos } =
    body;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un usuario con el id ${id}`,
      });
    }

    const getEmail = await usuario.get().email;
    const getNumeroDocumento = await usuario.get().numeroDocumento;
    const getNumeroCelular = await usuario.get().numeroCelular;
    const getLogin = await usuario.get().login;

    // =======================================================================
    //                          Actualizar Usuario
    // =======================================================================

    if (getEmail !== email) {
      const existeEmail = await Usuario.findOne({
        where: {
          email: email,
        },
      });
      if (existeEmail) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con este email ${email}`,
        });
      }
    } else if (numeroDocumento) {
      // Valida si recibe el número de documento
      if (getNumeroDocumento !== numeroDocumento) {
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
    } else if (getNumeroCelular !== numeroCelular) {
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
    } else if (getLogin !== login) {
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

    // Encriptar contraseña
    if (password) {
      const salt = bcrypt.genSaltSync();
      campos.password = await bcrypt.hashSync(password, salt);
    }

    campos.email = await email;
    campos.numeroDocumento = await numeroDocumento;
    campos.numeroCelular = await numeroCelular;
    campos.login = await login;

    const usuarioActualizado = await usuario.update(campos, { new: true });
    res.json({ ok: true, msg: "Usuario Actualizado", usuarioActualizado });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
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
  const email = req.query.email;
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
