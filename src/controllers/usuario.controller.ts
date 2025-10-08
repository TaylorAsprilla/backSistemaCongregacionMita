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
import { col, fn, Op, Transaction, where } from "sequelize";
import { AUDITORIAUSUARIO_ENUM } from "../enum/auditoriaUsuario.enum";
import Congregacion from "../models/congregacion.model";
import Pais from "../models/pais.model";
import Campo from "../models/campo.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
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

export const buscarNumerosMitas = async (req: Request, res: Response) => {
  const { numerosMitas, fechaNacimiento } = req.body; // Recibe un array de números Mitas y una fecha de nacimiento en el cuerpo de la solicitud

  // Validar que `numerosMitas` sea un array y que `fechaNacimiento` sea proporcionada
  if (!Array.isArray(numerosMitas) || numerosMitas.length === 0) {
    return res.status(400).json({
      ok: false,
      msg: "Debe proporcionar un array de números Mitas.",
    });
  }

  if (!fechaNacimiento) {
    return res.status(400).json({
      ok: false,
      msg: "Debe proporcionar una fecha de nacimiento.",
    });
  }

  try {
    // Buscar usuarios cuyos IDs coincidan con los números Mitas proporcionados y tengan la misma fecha de nacimiento
    const usuarios = await Usuario.findAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "fechaNacimiento",
      ],
      where: {
        id: numerosMitas,
        [Op.and]: [
          where(fn("DATE", col("fechaNacimiento")), fechaNacimiento), // Compara solo la parte de la fecha
        ],
      },
    });

    if (usuarios.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: "No se encontraron usuarios con los números Mitas y la fecha de nacimiento proporcionados.",
      });
    }

    res.json({
      ok: true,
      usuarios,
    });
  } catch (error) {
    console.error("Error al buscar números Mitas:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno, contacte al administrador.",
      error,
    });
  }
};

export const buscarPorNumeroDocumento = async (req: Request, res: Response) => {
  const { numeroDocumento, paisId } = req.query;

  if (!numeroDocumento) {
    return res.status(400).json({
      ok: false,
      msg: "Debe proporcionar un número de documento.",
    });
  }

  if (!paisId) {
    return res.status(400).json({
      ok: false,
      msg: "Debe proporcionar el ID del país.",
    });
  }

  try {
    const pais = await Pais.findByPk(Number(paisId));

    if (!pais) {
      return res.status(404).json({
        ok: false,
        msg: "País no encontrado.",
      });
    }

    // Buscar usuario por número de documento
    const usuario = await Usuario.findOne({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "numeroDocumento",
        "fechaNacimiento",
        "email",
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "codigoPostalDireccion",
        "paisDireccion",
        "numeroCelular",
        "estado",
      ],
      include: [
        {
          model: Pais,
          as: "usuarioCongregacionPais",
          attributes: ["id", "pais"],
          where: { id: Number(paisId) }, // Filtrar por el país especificado
          required: true, // INNER JOIN para asegurar que el usuario pertenezca al país
        },
        {
          model: Congregacion,
          as: "usuarioCongregacionCongregacion",
          attributes: ["id", "congregacion"],
          required: false,
        },
        {
          model: Campo,
          as: "usuarioCongregacionCampo",
          attributes: ["id", "campo"],
          required: false,
        },
      ],
      where: {
        numeroDocumento: numeroDocumento as string,
        estado: ESTADO_USUARIO_ENUM.ACTIVO,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: `No se encontró ningún usuario con el número de documento ${numeroDocumento} en el país especificado.`,
      });
    }

    res.json({
      ok: true,
      usuario,
      msg: "Usuario encontrado correctamente.",
    });
  } catch (error) {
    console.error("Error al buscar usuario por número de documento:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno, contacte al administrador.",
      error,
    });
  }
};

export const buscarPorNumeroMita = async (req: Request, res: Response) => {
  const { numeroMita } = req.query;

  if (!numeroMita) {
    return res.status(400).json({
      ok: false,
      msg: "Debe proporcionar un número Mita.",
    });
  }

  try {
    const usuario = await Usuario.findByPk(numeroMita as string, {
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "email",
      ],
    });

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: "No se encontró un usuario con el número Mita proporcionado.",
      });
    }

    res.json({
      ok: true,
      usuario,
    });
  } catch (error) {
    console.error("Error al buscar usuarios por número Mita:", error);
    res.status(500).json({
      ok: false,
      msg: "Error interno, contacte al administrador.",
      error,
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
    // =======================================================================
    //                   Obtener datos del usuario y ubicación anterior
    // =======================================================================
    
    const usuario = await Usuario.findByPk(id, { transaction });
    if (!usuario) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe un usuario con el id ${id}`,
      });
    }

    // Obtener la congregación anterior del usuario
    const congregacionAnterior = await UsuarioCongregacion.findOne({
      where: { usuario_id: Number(id) },
      transaction,
    });

    const datosUsuario = {
      nombre: `${usuario.getDataValue("primerNombre") || ""} ${
        usuario.getDataValue("segundoNombre") || ""
      } ${usuario.getDataValue("primerApellido") || ""} ${
        usuario.getDataValue("segundoApellido") || ""
      }`.replace(/\s+/g, " ").trim(),
      email: usuario.getDataValue("email") || "No disponible",
      celular: usuario.getDataValue("numeroCelular") || "No disponible",
    };

    // =======================================================================
    //                   Actualizar congregación del usuario
    // =======================================================================
    
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

    // =======================================================================
    //                   Obtener información de las nuevas ubicaciones
    // =======================================================================
    
    const [nuevoPais, nuevaCongregacion, nuevoCampo] = await Promise.all([
      Pais.findByPk(pais_id, { transaction }),
      Congregacion.findByPk(congregacion_id, { transaction }),
      Campo.findByPk(campo_id, { transaction }),
    ]);

    if (!nuevoPais || !nuevaCongregacion || !nuevoCampo) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        msg: "Error: País, congregación o campo no encontrados",
      });
    }

    const nuevaUbicacion = {
      pais: nuevoPais.getDataValue("pais"),
      congregacion: nuevaCongregacion.getDataValue("congregacion"),
      campo: nuevoCampo.getDataValue("campo"),
    };

    await transaction.commit();

    // =======================================================================
    //                   Enviar notificaciones por email
    // =======================================================================
    
    // Helper para renderizar plantillas de email
    function renderTemplate(template: string, variables: Record<string, string>) {
      let result = template;
      for (const key in variables) {
        const value = variables[key] ?? "";
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
      }
      return result;
    }

    // Determinar qué cambió para enviar emails condicionales
    const paisAnterior = congregacionAnterior ? congregacionAnterior.getDataValue("pais_id") : null;
    const congregacionAnteriorId = congregacionAnterior ? congregacionAnterior.getDataValue("congregacion_id") : null;
    const campoAnterior = congregacionAnterior ? congregacionAnterior.getDataValue("campo_id") : null;

    const paisCambio = paisAnterior !== pais_id;
    const congregacionCambio = congregacionAnteriorId !== congregacion_id;
    const campoCambio = campoAnterior !== campo_id;

    console.log("Validación de cambios:");
    console.log(`País: ${paisAnterior} -> ${pais_id} (cambió: ${paisCambio})`);
    console.log(`Congregación: ${congregacionAnteriorId} -> ${congregacion_id} (cambió: ${congregacionCambio})`);
    console.log(`Campo: ${campoAnterior} -> ${campo_id} (cambió: ${campoCambio})`);

    // Cargar template de email
    const templatePath = path.join(
      __dirname,
      "../templates/nuevoFeligresTransferido.html"
    );
    const emailTemplate = fs.readFileSync(templatePath, "utf8");

    // Variables comunes para el email
    const variablesComunes = {
      imagenEmail,
      nombreFeligres: datosUsuario.nombre,
      emailFeligres: datosUsuario.email,
      celularFeligres: datosUsuario.celular,
      nuevoPais: nuevaUbicacion.pais,
      nuevaCongregacion: nuevaUbicacion.congregacion,
      nuevoCampo: nuevaUbicacion.campo,
    };

    const emailPromises: Promise<void>[] = [];

    // =======================================================================
    //                   Notificar al Obrero País (si el país cambió)
    // =======================================================================
    if (paisCambio && congregacionAnterior && nuevoPais.getDataValue("idObreroEncargado")) {
      const obreroPromise = Usuario.findByPk(nuevoPais.getDataValue("idObreroEncargado"))
        .then(async (obreroPais) => {
          if (obreroPais && obreroPais.getDataValue("email")) {
            const nombreObrero = `${obreroPais.getDataValue("primerNombre") || ""} ${
              obreroPais.getDataValue("segundoNombre") || ""
            } ${obreroPais.getDataValue("primerApellido") || ""} ${
              obreroPais.getDataValue("segundoApellido") || ""
            }`.replace(/\s+/g, " ").trim();

            const emailPersonalizado = renderTemplate(emailTemplate, {
              ...variablesComunes,
              nombreObrero,
              tipoJurisdiccion: "país",
            });

            await enviarEmail(
              obreroPais.getDataValue("email"),
              "Nuevo Feligrés Transferido - País",
              emailPersonalizado
            );
            console.log(`Email enviado al Obrero País: ${nombreObrero}`);
          }
        })
        .catch(error => console.error("Error enviando email al Obrero País:", error));
      
      emailPromises.push(obreroPromise);
    }

    // =======================================================================
    //                   Notificar al Obrero Congregación (si la congregación cambió)
    // =======================================================================
    if (congregacionCambio && congregacionAnterior) {
      // Obrero Encargado Principal
      if (nuevaCongregacion.getDataValue("idObreroEncargado")) {
        const obreroPromise = Usuario.findByPk(nuevaCongregacion.getDataValue("idObreroEncargado"))
          .then(async (obreroCongregacion) => {
            if (obreroCongregacion && obreroCongregacion.getDataValue("email")) {
              const nombreObrero = `${obreroCongregacion.getDataValue("primerNombre") || ""} ${
                obreroCongregacion.getDataValue("segundoNombre") || ""
              } ${obreroCongregacion.getDataValue("primerApellido") || ""} ${
                obreroCongregacion.getDataValue("segundoApellido") || ""
              }`.replace(/\s+/g, " ").trim();

              const emailPersonalizado = renderTemplate(emailTemplate, {
                ...variablesComunes,
                nombreObrero,
                tipoJurisdiccion: "congregación",
              });

              await enviarEmail(
                obreroCongregacion.getDataValue("email"),
                "Nuevo Feligrés Transferido - Congregación",
                emailPersonalizado
              );
              console.log(`Email enviado al Obrero Congregación Principal: ${nombreObrero}`);
            }
          })
          .catch(error => console.error("Error enviando email al Obrero Congregación Principal:", error));
        
        emailPromises.push(obreroPromise);
      }

      // Obrero Encargado Secundario
      if (nuevaCongregacion.getDataValue("idObreroEncargadoDos")) {
        const obreroPromise = Usuario.findByPk(nuevaCongregacion.getDataValue("idObreroEncargadoDos"))
          .then(async (obreroCongregacionDos) => {
            if (obreroCongregacionDos && obreroCongregacionDos.getDataValue("email")) {
              const nombreObrero = `${obreroCongregacionDos.getDataValue("primerNombre") || ""} ${
                obreroCongregacionDos.getDataValue("segundoNombre") || ""
              } ${obreroCongregacionDos.getDataValue("primerApellido") || ""} ${
                obreroCongregacionDos.getDataValue("segundoApellido") || ""
              }`.replace(/\s+/g, " ").trim();

              const emailPersonalizado = renderTemplate(emailTemplate, {
                ...variablesComunes,
                nombreObrero,
                tipoJurisdiccion: "congregación",
              });

              await enviarEmail(
                obreroCongregacionDos.getDataValue("email"),
                "Nuevo Feligrés Transferido - Congregación",
                emailPersonalizado
              );
              console.log(`Email enviado al Obrero Congregación Secundario: ${nombreObrero}`);
            }
          })
          .catch(error => console.error("Error enviando email al Obrero Congregación Secundario:", error));
        
        emailPromises.push(obreroPromise);
      }
    }

    // =======================================================================
    //                   Notificar al Obrero Campo (si el campo cambió)
    // =======================================================================
    if (campoCambio && congregacionAnterior) {
      // Obrero Encargado Principal
      if (nuevoCampo.getDataValue("idObreroEncargado")) {
        const obreroPromise = Usuario.findByPk(nuevoCampo.getDataValue("idObreroEncargado"))
          .then(async (obreroCampo) => {
            if (obreroCampo && obreroCampo.getDataValue("email")) {
              const nombreObrero = `${obreroCampo.getDataValue("primerNombre") || ""} ${
                obreroCampo.getDataValue("segundoNombre") || ""
              } ${obreroCampo.getDataValue("primerApellido") || ""} ${
                obreroCampo.getDataValue("segundoApellido") || ""
              }`.replace(/\s+/g, " ").trim();

              const emailPersonalizado = renderTemplate(emailTemplate, {
                ...variablesComunes,
                nombreObrero,
                tipoJurisdiccion: "campo",
              });

              await enviarEmail(
                obreroCampo.getDataValue("email"),
                "Nuevo Feligrés Transferido - Campo",
                emailPersonalizado
              );
              console.log(`Email enviado al Obrero Campo Principal: ${nombreObrero}`);
            }
          })
          .catch(error => console.error("Error enviando email al Obrero Campo Principal:", error));
        
        emailPromises.push(obreroPromise);
      }

      // Obrero Encargado Secundario
      if (nuevoCampo.getDataValue("idObreroEncargadoDos")) {
        const obreroPromise = Usuario.findByPk(nuevoCampo.getDataValue("idObreroEncargadoDos"))
          .then(async (obreroCampoDos) => {
            if (obreroCampoDos && obreroCampoDos.getDataValue("email")) {
              const nombreObrero = `${obreroCampoDos.getDataValue("primerNombre") || ""} ${
                obreroCampoDos.getDataValue("segundoNombre") || ""
              } ${obreroCampoDos.getDataValue("primerApellido") || ""} ${
                obreroCampoDos.getDataValue("segundoApellido") || ""
              }`.replace(/\s+/g, " ").trim();

              const emailPersonalizado = renderTemplate(emailTemplate, {
                ...variablesComunes,
                nombreObrero,
                tipoJurisdiccion: "campo",
              });

              await enviarEmail(
                obreroCampoDos.getDataValue("email"),
                "Nuevo Feligrés Transferido - Campo",
                emailPersonalizado
              );
              console.log(`Email enviado al Obrero Campo Secundario: ${nombreObrero}`);
            }
          })
          .catch(error => console.error("Error enviando email al Obrero Campo Secundario:", error));
        
        emailPromises.push(obreroPromise);
      }
    }

    // Ejecutar todos los emails secuencialmente para evitar conflictos
    for (const emailPromise of emailPromises) {
      await emailPromise;
    }

    let mensajeEmails = "";
    if (emailPromises.length === 0) {
      if (!congregacionAnterior) {
        mensajeEmails = "No se enviaron emails porque este es un usuario nuevo (primera asignación).";
      } else if (!paisCambio && !congregacionCambio && !campoCambio) {
        mensajeEmails = "No se enviaron emails porque no hubo cambios en la ubicación del usuario.";
      } else {
        mensajeEmails = "No se enviaron emails porque los obreros correspondientes no tienen emails configurados.";
      }
    } else {
      mensajeEmails = `Se enviaron ${emailPromises.length} notificaciones a los obreros correspondientes.`;
    }

    console.log(`Usuario transferido: ${datosUsuario.nombre}. ${mensajeEmails}`);

    res.json({
      ok: true,
      msg: "Usuario transferido satisfactoriamente",
      mensajeEmails,
      id,
      usuario,
      transferencia: {
        ubicacionAnterior: congregacionAnterior ? {
          pais_id: paisAnterior,
          congregacion_id: congregacionAnteriorId,
          campo_id: campoAnterior,
        } : null,
        ubicacionNueva: {
          pais_id,
          congregacion_id,
          campo_id,
        },
        cambios: {
          paisCambio,
          congregacionCambio,
          campoCambio,
        },
        emailsEnviados: emailPromises.length,
      },
    });

  } catch (error) {
    console.log("Error en transferirUsuario:", error);
    
    // Solo hacer rollback si la transacción no ha sido committed
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.log("Error durante rollback (posiblemente ya committed):", rollbackError);
    }
    
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error: error instanceof Error ? error.message : "Error desconocido",
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
