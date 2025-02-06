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
import enviarEmail from "../helpers/email";
import config from "../config/config";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

const templatePathCongregacionAsignada = path.join(
  __dirname,
  "../templates/congregacionAsignada.html"
);

const emailTemplateCongregacionAsignada = fs.readFileSync(
  templatePathCongregacionAsignada,
  "utf8"
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
    //                  Verificar y Eliminar Obreros de Congregaciones Anteriores
    // =======================================================================

    await Promise.all([
      idObreroEncargado
        ? Congregacion.update(
            { idObreroEncargado: null },
            {
              where: { idObreroEncargado, id: { [Op.not]: null } },
              transaction,
            }
          )
        : Promise.resolve(),
      idObreroEncargadoDos
        ? Congregacion.update(
            { idObreroEncargadoDos: null },
            {
              where: { idObreroEncargadoDos, id: { [Op.not]: null } },
              transaction,
            }
          )
        : Promise.resolve(),
    ]);

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
        "primerNombre"
      )} ${obreroEncargado.getDataValue(
        "segundoNombre"
      )} ${obreroEncargado.getDataValue(
        "primerApellido"
      )} ${obreroEncargado.getDataValue("segundoApellido")}`.trim();
      const emailObrero = obreroEncargado.getDataValue("email");

      const personalizarEmail = emailTemplateCongregacionAsignada
        .replace("{{imagenEmail}}", imagenEmail)
        .replace("{{nombreObrero}}", nombreObrero)
        .replace("{{nombreCongregacion}}", nombreCongregacion)
        .replace("{{numeroFeligreses}}", numeroFeligreses.toString());

      await enviarEmail(
        emailObrero,
        "Nueva Asignación de Congregación",
        personalizarEmail
      );
    }

    if (obreroEncargadoDos) {
      const nombreObreroDos = `${obreroEncargadoDos.getDataValue(
        "primerNombre"
      )} ${obreroEncargadoDos.getDataValue(
        "segundoNombre"
      )} ${obreroEncargadoDos.getDataValue(
        "primerApellido"
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
        personalizarEmail
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
      nombreCongregacion
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
      "idObreroEncargadoDos"
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

    // Verificar si idObreroEncargado está definido antes de actualizar
    if (idObreroEncargado) {
      await Promise.all([
        Congregacion.update(
          { idObreroEncargado: null },
          {
            where: { idObreroEncargado, id: { [Op.not]: id } },
            transaction,
          }
        ),
        Campo.update(
          { idObreroEncargado: null },
          {
            where: { idObreroEncargado, id: { [Op.not]: id } },
            transaction,
          }
        ),
      ]);
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

    if (
      idObreroEncargado &&
      idObreroEncargado !== previousIdObreroEncargado &&
      nuevoObreroPrincipal
    ) {
      const nombreObrero = `${nuevoObreroPrincipal.getDataValue(
        "primerNombre"
      )} ${nuevoObreroPrincipal.getDataValue(
        "segundoNombre"
      )} ${nuevoObreroPrincipal.getDataValue(
        "primerApellido"
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
        personalizarEmail
      );
    }

    if (
      idObreroEncargadoDos &&
      idObreroEncargadoDos !== previousIdObreroEncargadoDos &&
      nuevoObreroSecundario
    ) {
      const nombreObreroDos = `${nuevoObreroSecundario.getDataValue(
        "primerNombre"
      )} ${nuevoObreroSecundario.getDataValue(
        "segundoNombre"
      )} ${nuevoObreroSecundario.getDataValue(
        "primerApellido"
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
        personalizarEmail
      );
    }

    await transaction.commit();

    res.json({
      ok: true,
      msg: "Congregación Actualizada",
      congregacionActualizada,
    });

    console.info(
      "Congregacion actualizada ",
      congregacionActualizada?.getDataValue("congregacion")
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
  res: Response
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
  res: Response
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
