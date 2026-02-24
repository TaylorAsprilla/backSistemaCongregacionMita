import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Congregacion from "../models/congregacion.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import { CONGREGACIONES_ID } from "../enum/congregaciones.enum";
import { Op, Transaction } from "sequelize";
import Campo from "../models/campo.model";
import Usuario from "../models/usuario.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import enviarEmail from "../helpers/email";
import agregarPermisoUsuario from "../helpers/agregarPermisoUsuario";
import eliminarPermisoUsuario from "../helpers/eliminarPermisoUsuario";
import config from "../config/config";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";
import { ROLES_ID } from "../enum/roles.enum";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

const templatePathCongregacionAsignada = path.join(
  __dirname,
  "../templates/congregacionAsignada.html",
);

const emailTemplateCongregacionAsignada = fs.readFileSync(
  templatePathCongregacionAsignada,
  "utf8",
);

export const getCongregaciones = async (req: Request, res: Response) => {
  try {
    const congregacion = await Congregacion.findAll({
      where: {
        estado: true,
      },
      order: db.col("congregacion"),
    });

    res.json({
      ok: true,
      congregacion,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getCongregacion = async (req: Request, res: Response) => {
  const { id } = req.params;

  const congregacion = await Congregacion.findByPk(id);

  if (congregacion) {
    res.json({
      ok: true,
      congregacion,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe la congregación con el id ${id}`,
    });
  }
};

export const crearCongregacion = async (req: Request, res: Response) => {
  const { body } = req;
  const { idObreroEncargado, idObreroEncargadoDos } = body;

  const transaction: Transaction = await db.transaction();

  try {
    // =======================================================================
    //                          Guardar Congregación
    // =======================================================================

    const congregacion = await Congregacion.create(body, { transaction });

    const congregacionId = congregacion.getDataValue("id");

    // =======================================================================
    //                       Enviar Correos a Obreros Asignados
    // =======================================================================

    const [obreroEncargado, obreroEncargadoDos] = await Promise.all([
      idObreroEncargado
        ? Usuario.findByPk(idObreroEncargado, { transaction })
        : null,
      idObreroEncargadoDos
        ? Usuario.findByPk(idObreroEncargadoDos, { transaction })
        : null,
    ]);

    const nombreCongregacion = congregacion.getDataValue("congregacion");
    const numeroFeligreses = 0; // Asume que el número de feligreses será 0 al crear una nueva congregación

    if (obreroEncargado) {
      const nombreObrero = `${obreroEncargado.getDataValue(
        "primerNombre",
      )} ${obreroEncargado.getDataValue(
        "segundoNombre",
      )} ${obreroEncargado.getDataValue(
        "primerApellido",
      )} ${obreroEncargado.getDataValue("segundoApellido")}`.trim();
      const emailObrero = obreroEncargado.getDataValue("email");

      const personalizarEmail = emailTemplateCongregacionAsignada
        .replace("{{imagenEmail}}", imagenEmail)
        .replace("{{nombreObrero}}", nombreObrero)
        .replace("{{nombreCongregacion}}", nombreCongregacion)
        .replace("{{numeroFeligreses}}", numeroFeligreses.toString());

      await enviarEmail(
        emailObrero,
        "Nueva Congregación Asignada",
        personalizarEmail,
      );
    }

    if (obreroEncargadoDos) {
      const nombreObreroDos = `${obreroEncargadoDos.getDataValue(
        "primerNombre",
      )} ${obreroEncargadoDos.getDataValue(
        "segundoNombre",
      )} ${obreroEncargadoDos.getDataValue(
        "primerApellido",
      )} ${obreroEncargadoDos.getDataValue("segundoApellido")}`.trim();
      const emailObreroDos = obreroEncargadoDos.getDataValue("email");

      const personalizarEmail = emailTemplateCongregacionAsignada
        .replace("{{imagenEmail}}", imagenEmail)
        .replace("{{nombreObrero}}", nombreObreroDos)
        .replace("{{nombreCongregacion}}", nombreCongregacion)
        .replace("{{numeroFeligreses}}", numeroFeligreses.toString());

      await enviarEmail(
        emailObreroDos,
        "Nueva Asignación de Congregación",
        personalizarEmail,
      );
    }

    await transaction.commit();
    res.json({
      ok: true,
      msg: "Se ha creado la congregación exitosamente.",
      congregacion,
    });
    console.info(
      "Se ha guardado la congregación exitosamente",
      nombreCongregacion,
    );
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarCongregacion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;
  const { email, password, idObreroEncargado, idObreroEncargadoDos } = req.body;

  const transaction: Transaction = await db.transaction();

  try {
    // Obtener la congregación actual y los valores de los obreros
    const congregacion = await Congregacion.findByPk(id);

    if (!congregacion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una congregación con el id ${id}`,
      });
    }

    const previousIdObreroEncargado =
      congregacion.getDataValue("idObreroEncargado");

    const previousIdObreroEncargadoDos = congregacion.getDataValue(
      "idObreroEncargadoDos",
    );

    // Verificar si el email ya está registrado en la tabla de usuarios o tabla congregación
    if (email) {
      const [usuarioExistente, congregacionExistente] = await Promise.all([
        Usuario.findOne({ where: { email: { [Op.eq]: email } } }),
        Congregacion.findOne({
          where: { email: { [Op.eq]: email }, id: { [Op.ne]: id } },
        }),
      ]);

      if (usuarioExistente || congregacionExistente) {
        return res.status(400).json({
          ok: false,
          msg: "El email ya está registrado, por favor utilice otro email.",
        });
      }
    }

    // Crear un objeto con los campos a actualizar
    const updateFields: any = {
      congregacion: body.congregacion,
      pais_id: body.pais_id,
      idObreroEncargado:
        idObreroEncargado !== undefined
          ? idObreroEncargado
          : previousIdObreroEncargado,
      idObreroEncargadoDos:
        idObreroEncargadoDos !== undefined ? idObreroEncargadoDos : null,
      email: email,
    };

    // Encriptar la contraseña si se proporciona
    if (password) {
      const salt = bcrypt.genSaltSync();
      const passwordHashed = bcrypt.hashSync(password, salt);
      updateFields.password = passwordHashed;
    }

    // Actualizar la congregación específica
    const [numUpdated] = await Congregacion.update(updateFields, {
      where: { id },
      transaction,
    });

    // Verificar si se hizo alguna actualización
    if (numUpdated === 0) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe una congregación con el id ${id}`,
      });
    }

    // Obtener la congregación actualizada
    const congregacionActualizada = await Congregacion.findByPk(id, {
      transaction: transaction,
    });

    // Obtener el número de feligreses
    const numeroFeligreses = await UsuarioCongregacion.count({
      where: { congregacion_id: id },
    });

    // Enviar correos electrónicos si los obreros cambiaron
    const [nuevoObreroPrincipal, nuevoObreroSecundario] = await Promise.all([
      idObreroEncargado && Usuario.findByPk(idObreroEncargado),
      idObreroEncargadoDos && Usuario.findByPk(idObreroEncargadoDos),
    ]);

    // Gestionar permisos y notificaciones del obrero principal
    if (
      idObreroEncargado !== undefined &&
      idObreroEncargado !== previousIdObreroEncargado
    ) {
      // Eliminar permiso del obrero anterior solo si no está en otras congregaciones
      if (previousIdObreroEncargado) {
        const congregacionesConObrero = await Congregacion.count({
          where: {
            [Op.or]: [
              { idObreroEncargado: previousIdObreroEncargado },
              { idObreroEncargadoDos: previousIdObreroEncargado },
            ],
            id: { [Op.not]: id },
          },
          transaction,
        });

        // Solo eliminar permiso si no está asignado a ninguna otra congregación
        if (congregacionesConObrero === 0) {
          await eliminarPermisoUsuario(
            previousIdObreroEncargado,
            ROLES_ID.OBRERO_CIUDAD,
            transaction,
          );
        }
      }

      // Agregar permiso y enviar email al nuevo obrero (solo si no es null)
      if (idObreroEncargado && nuevoObreroPrincipal) {
        await agregarPermisoUsuario(
          idObreroEncargado,
          ROLES_ID.OBRERO_CIUDAD,
          transaction,
        );

        const nombreObrero = `${nuevoObreroPrincipal.getDataValue(
          "primerNombre",
        )} ${nuevoObreroPrincipal.getDataValue(
          "segundoNombre",
        )} ${nuevoObreroPrincipal.getDataValue(
          "primerApellido",
        )} ${nuevoObreroPrincipal.getDataValue("segundoApellido")}`.trim();
        const emailObrero = nuevoObreroPrincipal.getDataValue("email");
        const nombreCongregacion =
          congregacionActualizada?.getDataValue("congregacion");
        const personalizarEmail = emailTemplateCongregacionAsignada
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombreObrero}}", nombreObrero)
          .replace("{{nombreCongregacion}}", nombreCongregacion)
          .replace("{{numeroFeligreses}}", numeroFeligreses.toString());

        await enviarEmail(
          emailObrero,
          "Nueva Asignación de Congregación",
          personalizarEmail,
        );
      }
    }

    // Gestionar permisos y notificaciones del obrero secundario
    if (
      idObreroEncargadoDos !== undefined &&
      idObreroEncargadoDos !== previousIdObreroEncargadoDos
    ) {
      // Eliminar permiso del obrero anterior solo si no está en otras congregaciones
      if (previousIdObreroEncargadoDos) {
        const congregacionesConObrero = await Congregacion.count({
          where: {
            [Op.or]: [
              { idObreroEncargado: previousIdObreroEncargadoDos },
              { idObreroEncargadoDos: previousIdObreroEncargadoDos },
            ],
            id: { [Op.not]: id },
          },
          transaction,
        });

        // Solo eliminar permiso si no está asignado a ninguna otra congregación
        if (congregacionesConObrero === 0) {
          await eliminarPermisoUsuario(
            previousIdObreroEncargadoDos,
            ROLES_ID.OBRERO_CIUDAD,
            transaction,
          );
        }
      }

      // Agregar permiso y enviar email al nuevo obrero (solo si no es null)
      if (idObreroEncargadoDos && nuevoObreroSecundario) {
        await agregarPermisoUsuario(
          idObreroEncargadoDos,
          ROLES_ID.OBRERO_CIUDAD,
          transaction,
        );

        const nombreObreroDos = `${nuevoObreroSecundario.getDataValue(
          "primerNombre",
        )} ${nuevoObreroSecundario.getDataValue(
          "segundoNombre",
        )} ${nuevoObreroSecundario.getDataValue(
          "primerApellido",
        )} ${nuevoObreroSecundario.getDataValue("segundoApellido")}`.trim();
        const emailObreroDos = nuevoObreroSecundario.getDataValue("email");
        const nombreCongregacion =
          congregacionActualizada?.getDataValue("congregacion");
        const personalizarEmail = emailTemplateCongregacionAsignada
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombreObrero}}", nombreObreroDos)
          .replace("{{nombreCongregacion}}", nombreCongregacion)
          .replace("{{numeroFeligreses}}", numeroFeligreses.toString());

        await enviarEmail(
          emailObreroDos,
          "Nueva Asignación de Congregación",
          personalizarEmail,
        );
      }
    }

    await transaction.commit();

    res.json({
      ok: true,
      msg: "Congregación Actualizada",
      congregacionActualizada,
    });

    console.info(
      "Congregacion actualizada.",
      congregacionActualizada?.getDataValue("congregacion"),
    );
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarCongregacion = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const congregacion = await Congregacion.findByPk(id);
    if (congregacion) {
      const nombre = await congregacion.get().congregacion;

      await congregacion.update({ estado: false });

      res.json({
        ok: true,
        msg: `La Congregación ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!congregacion) {
      return res.status(404).json({
        msg: `No existe una congregación con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarCongregacion = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const congregacion = await Congregacion.findByPk(id);
    if (!!congregacion) {
      const nombre = await congregacion.get().congregacion;

      if (congregacion.get().estado === false) {
        await congregacion.update({ estado: true });
        res.json({
          ok: true,
          msg: `La Congregación ${nombre} se activó`,
          congregacion,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La congregacion ${nombre} esta activa`,
          congregacion,
        });
      }
    }

    if (!congregacion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una congregación con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

/**
 * GET /api/v1/congregaciones
 * Endpoint REST para listar TODAS las congregaciones de un país
 * Requiere autenticación por API Key (header X-API-KEY)
 */
export const getCongregacionesPorPais = async (req: Request, res: Response) => {
  try {
    // =======================================================================
    //                  VALIDACIÓN DE PARÁMETROS
    // =======================================================================

    const idPaisRaw = req.query.id_pais as string;

    if (!idPaisRaw) {
      return res.status(400).json({
        error: {
          code: "MISSING_REQUIRED_PARAM",
          message: "El parámetro id_pais es obligatorio",
          details: { param: "id_pais" },
        },
      });
    }

    const id_pais = parseInt(idPaisRaw, 10);

    if (isNaN(id_pais) || id_pais <= 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_PARAM",
          message: "El parámetro id_pais debe ser un número positivo válido",
          details: { param: "id_pais", value: idPaisRaw },
        },
      });
    }

    // =======================================================================
    //                  CONSULTA A BASE DE DATOS
    // =======================================================================

    const { count, rows } = await Congregacion.findAndCountAll({
      where: {
        pais_id: id_pais,
        estado: true,
      },
      order: [["congregacion", "ASC"]],
      attributes: [
        "id",
        "congregacion",
        "pais_id",
        "estado",
        "email",
        "idObreroEncargado",
        "idObreroEncargadoDos",
        "createdAt",
        "updatedAt",
      ],
    });

    // =======================================================================
    //                  RESPUESTA
    // =======================================================================

    return res.status(200).json({
      data: rows,
      meta: {
        total: count,
      },
    });
  } catch (error) {
    console.error("Error en getCongregacionesPorPais:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener las congregaciones",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
    });
  }
};
