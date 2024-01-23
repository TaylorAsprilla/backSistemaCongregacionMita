import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Campo from "../models/campo.model";
import { Op } from "sequelize";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import Congregacion from "../models/congregacion.model";

export const getCampos = async (req: Request, res: Response) => {
  try {
    const campo = await Campo.findAll({
      order: db.col("campo"),
    });

    res.json({
      ok: true,
      campo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getCampo = async (req: Request, res: Response) => {
  const { id } = req.params;

  const campo = await Campo.findByPk(id);

  if (campo) {
    res.json({
      ok: true,
      campo,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe el campo con el id ${id}`,
    });
  }
};

export const crearCampo = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Campo
    // =======================================================================

    const campo = Campo.build(body);
    await campo.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el campo exitosamente ",
      campo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarCampo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  const idObreroEncargado = body.idObreroEncargado ?? null;
  const congregacion_id = body.congregacion_id;

  const transaction = await db.transaction();

  try {
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

    const [numUpdated] = await Campo.update(
      {
        campo: body.campo,
        congregacion_id: congregacion_id,
        idObreroEncargado: idObreroEncargado,
      },
      { where: { id }, transaction }
    );

    // Verificar si se hizo alguna actualización
    if (numUpdated === 0) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe un campo con el id ${id}`,
      });
    }

    // Obtener el campo actualizado
    const campoActualizado = await Campo.findByPk(id, {
      transaction: transaction,
    });

    // Verificar si idObreroEncargado está definido antes de actualizar
    if (idObreroEncargado !== undefined && campoActualizado) {
      const pais = await Congregacion.findByPk(congregacion_id, {
        transaction: transaction,
      });

      if (pais) {
        console.log("pais.getDataValue(id)", pais.getDataValue("id"));
        // Actualizar UsuarioCongregacion usando la transacción
        await UsuarioCongregacion.update(
          {
            pais_id: pais.getDataValue("pais_id"),
            congregacion_id: congregacion_id,
            campo_id: campoActualizado.getDataValue("id"),
          },
          {
            where: {
              usuario_id: idObreroEncargado,
            },
            transaction: transaction,
          }
        );
      }
    }

    await transaction.commit();

    res.json({
      ok: true,
      msg: "Campo Actualizado",
      campoActualizado: campoActualizado,
    });
  } catch (error) {
    await transaction.rollback();
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarCampo = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const campo = await Campo.findByPk(id);
    if (campo) {
      const nombre = await campo.get().campo;

      await campo.update({ estado: false });

      res.json({
        ok: true,
        msg: `El campo ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!campo) {
      return res.status(404).json({
        msg: `No existe un campo con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarCampo = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const campo = await Campo.findByPk(id);
    if (!!campo) {
      const nombre = await campo.get().campo;

      if (campo.get().estado === false) {
        await campo.update({ estado: true });
        res.json({
          ok: true,
          msg: `El campo ${nombre} se activó`,
          campo,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El campo ${nombre} esta activo`,
          campo,
        });
      }
    }

    if (!campo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un campo con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
