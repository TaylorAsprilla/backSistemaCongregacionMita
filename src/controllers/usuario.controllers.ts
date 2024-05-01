import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import { CustomRequest } from "../middlewares/validar-jwt";
import config from "../config/config";
import enviarEmail from "../helpers/email";
import db from "../database/connection";
import {
  actualizarCongregacion,
  agregarPermisos,
  auditoriaUsuario,
  crearAsociacionesUsuario,
  crearCongregacionUsuario,
  eliminarAsociacionesUsuario,
} from "../database/usuario.associations";
import { Op } from "sequelize";
import { AUDITORIAUSUARIO_ENUM } from "../enum/auditoriaUsuario.enum";
import Congregacion from "../models/congregacion.model";
import Pais from "../models/pais.model";
import Campo from "../models/campo.model";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    // Obtener todos los usuarios asociados a esta congregación
    const { count, rows } = await Usuario.findAndCountAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "apodo",
        "fechaNacimiento",
        "email",
        "numeroCelular",
        "estado",
      ],
      include: [
        {
          model: Pais,
          as: "usuarioCongregacionPais",
          attributes: ["pais"],
        },
        {
          model: Congregacion,
          as: "usuarioCongregacionCongregacion",
          attributes: ["congregacion"],
        },
        {
          model: Campo,
          as: "usuarioCongregacionCampo",
          attributes: ["campo"],
        },
      ],
    });

    // Enviar respuesta al cliente
    res.json({
      ok: true,
      usuarios: rows,
      totalUsuarios: count,
      msg: "Usuarios registrados con paginación",
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener usuarios, por favor contacta al administrador",
      error,
    });
  }
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
      msg: `No se encuentra el número Mita <b>${id}</b>`,
    });
  }
};

export const crearUsuario = async (req: CustomRequest, res: Response) => {
  const transaction = await db.transaction();
  const idUsuarioActual = req.id;

  try {
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
      ministerios,
      voluntariados,
      congregacion,
    } = body;

    const { pais_id, congregacion_id, campo_id } = congregacion;

    // =======================================================================
    //                          Validaciones
    // =======================================================================

    if (email) {
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

    if (login) {
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

    const nuevoUsuario = await Usuario.create(req.body, {
      transaction: transaction,
    });

    const id = nuevoUsuario.getDataValue("id");

    await eliminarAsociacionesUsuario(id, transaction);
    await crearAsociacionesUsuario(id, ministerios, voluntariados, transaction);

    await crearCongregacionUsuario(
      id,
      pais_id,
      congregacion_id,
      campo_id,
      transaction
    );

    await auditoriaUsuario(
      id,
      Number(idUsuarioActual),
      AUDITORIAUSUARIO_ENUM.CREACION,
      transaction
    );

    await transaction.commit();

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
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Error al crear el usuario:", error);

    res.status(500).json({
      error,
      msg: "Error al crear el usuario",
    });
  }
};

export const actualizarUsuario = async (req: CustomRequest, res: Response) => {
  const transaction = await db.transaction();
  const idUsuarioActual = req.id;

  const { id } = req.params;
  const { body } = req;
  const {
    password,
    email,
    numeroDocumento,
    login,
    direcciones,
    ministerios,
    voluntariados,
    congregacion,
    ...campos
  } = body;

  campos.email = email;

  try {
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un usuario con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Usuario
    // =======================================================================

    if (email && usuario.getDataValue("email") !== email) {
      const existeEmail = await Usuario.findOne({
        where: {
          email: email,
          id: { [Op.ne]: id },
        },
      });
      campos.email = email;

      if (existeEmail) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con este email ${email}`,
        });
      } else {
        campos.email = email;
        if (
          usuario.getDataValue("login") &&
          usuario.getDataValue("login") === usuario.getDataValue("email")
        )
          campos.login = email;
      }
    }

    // Validar cambios en el número de documento
    if (
      !!numeroDocumento &&
      usuario.getDataValue("numeroDocumento") !== numeroDocumento
    ) {
      const existeNumeroDocumento = await Usuario.findOne({
        where: {
          numeroDocumento: numeroDocumento,
          id: { [Op.ne]: id },
        },
      });

      if (existeNumeroDocumento) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con este número de documento ${numeroDocumento}`,
        });
      } else {
        campos.numeroDocumento = numeroDocumento;
      }
    }

    // Validar cambios en el login
    if (!!login && usuario.getDataValue("login") !== login) {
      const existeLogin = await Usuario.findOne({
        where: {
          login: login,
          id: { [Op.ne]: id },
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
    if (!!password) {
      const salt = bcrypt.genSaltSync();
      campos.password = bcrypt.hashSync(password, salt);
    }

    // Realizar la actualización
    const usuarioActualizado = await usuario.update(campos);

    try {
      await eliminarAsociacionesUsuario(Number(id), transaction);

      await crearAsociacionesUsuario(
        Number(id),
        ministerios,
        voluntariados,

        transaction
      );

      await actualizarCongregacion(
        Number(id),
        congregacion.pais_id,
        congregacion.congregacion_id,
        congregacion.campo_id,
        transaction
      );

      await auditoriaUsuario(
        Number(id),
        Number(idUsuarioActual),
        AUDITORIAUSUARIO_ENUM.ACTUALIZACION,
        transaction
      );

      await transaction.commit();
      res.json({
        ok: true,
        msg: "Usuario Actualizado",
        usuario: usuarioActualizado,
        id,
      });
    } catch (error) {
      await transaction.rollback();
      console.log("error", error);
    }
  } catch (error) {
    console.error("Error al actualizar el usuario:", error);

    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador, no se logró actualizar el usuario",
      error,
    });
  }
};

export const eliminarUsuario = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  const transaction = await db.transaction();
  const idUsuarioActual = req.id;

  try {
    const usuario = await Usuario.findByPk(id, { transaction });
    if (usuario) {
      await usuario.update({ estado: false }, { transaction });

      await auditoriaUsuario(
        Number(id),
        Number(idUsuarioActual),
        AUDITORIAUSUARIO_ENUM.DESACTIVACION,
        transaction
      );

      await transaction.commit();
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
    await transaction.rollback();
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarPermisos = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { usuarioPermiso } = body;

  const transaction = await db.transaction();
  const idUsuarioActual = req.id;

  try {
    const usuario = await Usuario.findByPk(id, { transaction });
    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el id ${id}`,
      });
    }

    if (usuario) {
      await agregarPermisos(Number(id), usuarioPermiso, transaction);

      await auditoriaUsuario(
        Number(id),
        Number(idUsuarioActual),
        AUDITORIAUSUARIO_ENUM.ACTUALIZACION_DE_PERMISOS,
        transaction
      );

      await transaction.commit();
      res.json({
        ok: true,
        msg: `Se agregaron los permisos al usuario`,
        id,
        usuario,
      });
    }
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarUsuario = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  const idUsuarioActual = req.id;
  const transaction = await db.transaction();

  try {
    const usuario = await Usuario.findByPk(id, { transaction });
    if (!!usuario) {
      const primerNombre = await usuario.get().primerNombre;
      const segundoNombre = await usuario.get().segundoNombre;
      const primerApellido = await usuario.get().primerApellido;

      if (usuario.get().estado === false) {
        await usuario.update({ estado: true }, { transaction });

        await auditoriaUsuario(
          Number(id),
          Number(idUsuarioActual),
          AUDITORIAUSUARIO_ENUM.ACTIVACION,
          transaction
        );

        await transaction.commit();

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
    await transaction.rollback();
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
  const numeroCelular = req.query.numeroCelular as string;

  if (!numeroCelular) {
    res.status(500).json({
      ok: false,
      msg: `No existe parametro en la petición`,
    });
  } else {
    const numeroCelularFormateado = `+${numeroCelular.replace(/\s/, "")}`;
    try {
      const numeroCelularEncontrado = await Usuario.findOne({
        attributes: ["numeroCelular"],
        where: {
          numeroCelular: numeroCelularFormateado,
        },
      });
      if (!!numeroCelularEncontrado) {
        res.json({
          ok: false,
          msg: `Ya se encuentra registrado el número de celular ${numeroCelularFormateado}`,
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
