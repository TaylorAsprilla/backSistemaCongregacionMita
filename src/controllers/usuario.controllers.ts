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
import { Op, Transaction } from "sequelize";
import { AUDITORIAUSUARIO_ENUM } from "../enum/auditoriaUsuario.enum";
import Congregacion from "../models/congregacion.model";
import Pais from "../models/pais.model";
import Campo from "../models/campo.model";
import path from "path";
import fs from "fs";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";

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
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "codigoPostalDireccion",
        "paisDireccion",
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
        {
          model: Usuario,
          as: "usuarioQueRegistra",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
            "email",
            "numeroCelular",
          ],
        },
      ],
      where: {
        estado: ESTADO_USUARIO_ENUM.ACTIVO,
      },
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
      where: {
        estado: ESTADO_USUARIO_ENUM.ACTIVO,
      },
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
  const transaction: Transaction = await db.transaction();
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

    const validarExistencia = async (
      campo: string,
      valor: string,
      modelo: any
    ) => {
      if (valor) {
        const existe = await modelo.findOne({
          where: { [campo]: valor },
        });
        if (existe) {
          return `Ya existe un usuario con el ${campo} ${valor}`;
        }
      }
      return null;
    };

    // Validaciones para email, numeroDocumento, y login
    const errores = await Promise.all([
      validarExistencia("email", email, Usuario),
      validarExistencia("numeroDocumento", numeroDocumento, Usuario),
      validarExistencia("login", login, Usuario),
    ]);

    const mensajeError = errores.find((error) => error !== null);
    if (mensajeError) {
      return res.status(400).json({ ok: false, msg: mensajeError });
    }

    // =======================================================================
    //                          Guardar Usuario
    // =======================================================================

    // Encriptar contraseña
    if (password) {
      const salt = bcrypt.genSaltSync();
      body.password = bcrypt.hashSync(password, salt);
    }

    const nuevoUsuario = await Usuario.create(body, {
      transaction,
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

    if (email) {
      // =======================================================================
      //                          Enviar Correo Electrónico
      // =======================================================================

      const templatePath = path.join(
        __dirname,
        "../templates/bienvenidoCmarLive.html"
      );

      const emailTemplate = fs.readFileSync(templatePath, "utf8");

      const nombre: string = `${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}`;

      const personalizarEmail = emailTemplate
        .replace("{{imagenEmail}}", imagenEmail)
        .replace("{{nombre}}", nombre)
        .replace("{{id}}", id);

      await enviarEmail(
        email,
        "Bienvenido al censo de la Congregación Mita",
        personalizarEmail
      );
    }

    res.status(201).json({
      ok: true,
      id,
      msg: `Se creó el usuario correctamente, ${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}, con el número Mita ${id}`,
    });

    console.info(
      `Se creó el usuario correctamente, ${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}, con el número Mita ${id}`
    );
  } catch (error) {
    await transaction.rollback();

    console.error("Error al crear el usuario:", error);

    res.status(500).json({
      ok: false,
      msg: "Error al crear el usuario",
      error,
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
    idUsuarioQueRegistra,
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
          msg: `Ya existe un usuario con el login <b>${login}</b>`,
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
      console.error("error", error);
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

export const transferirUsuario = async (req: CustomRequest, res: Response) => {
  const { body } = req;
  const { id } = req.params;
  const { campo_id, congregacion_id, pais_id } = body;
  const idUsuarioActual = req.id;

  const transaction = await db.transaction();

  try {
    const usuario = await Usuario.findByPk(id, { transaction });
    if (usuario) {
      await actualizarCongregacion(
        Number(id),
        pais_id,
        congregacion_id,
        campo_id,
        transaction
      );

      await auditoriaUsuario(
        Number(id),
        Number(idUsuarioActual),
        AUDITORIAUSUARIO_ENUM.TRANSFERENCIA,
        transaction
      );

      await transaction.commit();
      res.json({
        ok: true,
        msg: `Se trasferió el usuario ${id}`,
        id,
        usuario,
      });
    }

    if (!usuario) {
      return res.status(404).json({
        msg: `Error al transferir el usuario`,
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

export const transcendioUsuario = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  const idUsuarioActual = req.id;

  const transaction = await db.transaction();

  try {
    const usuario = await Usuario.findByPk(id, { transaction });
    if (usuario) {
      await usuario.update(
        { estado: ESTADO_USUARIO_ENUM.TRANSCENDIO },
        { transaction }
      );

      await auditoriaUsuario(
        Number(id),
        Number(idUsuarioActual),
        AUDITORIAUSUARIO_ENUM.TRANSCENDIO,
        transaction
      );

      await transaction.commit();
      res.json({
        ok: true,
        msg: `El feligrés transcendió`,
        id,
        usuario,
      });
    }

    if (!usuario) {
      return res.status(404).json({
        msg: `Error al trasender el feligrés`,
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

export const eliminarUsuario = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  const transaction = await db.transaction();
  const idUsuarioActual = req.id;

  try {
    const usuario = await Usuario.findByPk(id, { transaction });
    if (usuario) {
      await usuario.update(
        { estado: ESTADO_USUARIO_ENUM.ELIMINADO },
        { transaction }
      );

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

      if (usuario.get().estado === ESTADO_USUARIO_ENUM.ELIMINADO) {
        await usuario.update(
          { estado: ESTADO_USUARIO_ENUM.ACTIVO },
          { transaction }
        );

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
  const email = req.query.email as string;
  const idUsuario = req.query.idUsuario as string;

  if (!email) {
    return res.status(400).json({
      ok: false,
      msg: `No existe parametro en la petición`,
    });
  }

  try {
    const correoElectronico = await Usuario.findOne({
      attributes: ["email"],
      where: {
        email: email,
        id: { [Op.ne]: idUsuario },
      },
    });

    if (correoElectronico) {
      return res.json({
        ok: false,
        msg: `Ya se encuentra registrado el correo electrónico ${email}`,
      });
    }

    return res.json({
      ok: true,
      msg: `Correo electrónico válido`,
    });
  } catch (error) {
    console.error("Error al buscar el correo electrónico:", error);
    return res.status(500).json({
      ok: false,
      error,
      msg: "Hable con el administrador",
    });
  }
};
