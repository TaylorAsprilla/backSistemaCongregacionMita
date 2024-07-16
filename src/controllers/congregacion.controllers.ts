import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Congregacion from "../models/congregacion.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import { CONGREGACIONES_ID } from "../enum/congregaciones.enum";
import { Op } from "sequelize";
import Campo from "../models/campo.model";
import Usuario from "../models/usuario.model";

export const getCongregaciones = async (req: Request, res: Response) => {
  try {
    const congregacion = await Congregacion.findAll({
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

  try {
    // =======================================================================
    //                          Guardar Congregación
    // =======================================================================

    const congregacion = Congregacion.build(body);
    await congregacion.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la congregacion exitosamente ",
      congregacion,
    });
  } catch (error) {
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

  const transaction = await db.transaction();

  try {
    // Verificar si el email ya está registrado en la tabla de usuarios
    const usuarioExistente = await Usuario.findOne({
      where: {
        email: {
          [Op.and]: [
            { [Op.ne]: null }, // El email no debe ser null
            { [Op.not]: "" }, // El email no debe estar vacío
            { [Op.eq]: email }, // El email debe ser igual al proporcionado
          ],
        },
      },
    });
    if (usuarioExistente) {
      return res.status(400).json({
        ok: false,
        msg: "El email ya está registrado por favor utilice otro email.",
      });
    }

    // Verificar si el email ya está registrado en la tabla de congregaciones
    const congregacionExistente = await Congregacion.findOne({
      where: {
        email: {
          [Op.and]: [
            { [Op.ne]: null }, // El email no debe ser null
            { [Op.not]: "" }, // El email no debe estar vacío
            { [Op.eq]: email }, // El email debe ser igual al proporcionado
          ],
        },
        id: {
          [Op.ne]: id, // Excluir la congregación actual
        },
      },
    });

    if (congregacionExistente) {
      return res.status(400).json({
        ok: false,
        msg: "El email ya está registrado, por favor utilice otro email.",
      });
    }

    // Encriptar la contraseña si se proporciona
    let passwordHashed;
    if (!!password) {
      const salt = bcrypt.genSaltSync();
      passwordHashed = bcrypt.hashSync(password, salt);
    }

    // Verificar si idObreroEncargado está definido antes de actualizar
    if (idObreroEncargado !== undefined) {
      // Anular idObreroEncargado para otras congregaciones
      await Congregacion.update(
        { idObreroEncargado: null },
        {
          where: {
            idObreroEncargado: idObreroEncargado,
            id: {
              [Op.not]: id, // Excluir la congregación actual
            },
          },
          transaction: transaction,
        }
      );

      await Campo.update(
        { idObreroEncargado: null },
        {
          where: {
            idObreroEncargado: idObreroEncargado,
            id: {
              [Op.not]: id,
            },
          },
          transaction: transaction,
        }
      );
    }

    // Actualizar la congregación específica
    const [numUpdated] = await Congregacion.update(
      {
        congregacion: body.congregacion,
        pais_id: body.pais_id,
        idObreroEncargado:
          idObreroEncargado !== undefined ? idObreroEncargado : null,
        idObreroEncargadoDos:
          idObreroEncargadoDos !== undefined ? idObreroEncargadoDos : null,
        email: email,
        password: passwordHashed,
      },
      { where: { id }, transaction }
    );

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

    // Verificar si idObreroEncargado está definido antes de actualizar
    if (idObreroEncargado !== undefined) {
      if (congregacionActualizada) {
        // Actualizar UsuarioCongregacion usando la transacción
        await UsuarioCongregacion.update(
          {
            pais_id: congregacionActualizada.getDataValue("pais_id"),
            congregacion_id: congregacionActualizada.getDataValue("id"),
            campo_id: CONGREGACIONES_ID.SIN_CAMPO,
          },
          {
            where: {
              usuario_id:
                congregacionActualizada.getDataValue("idObreroEncargado"),
            },
            transaction: transaction,
          }
        );
      }
    }

    await transaction.commit();

    res.json({
      ok: true,
      msg: "Congregación Actualizada",
      congregacionActualizada,
    });
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
