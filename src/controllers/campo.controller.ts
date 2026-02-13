import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Campo from "../models/campo.model";
import { Op } from "sequelize";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import Congregacion from "../models/congregacion.model";
import agregarPermisoUsuario from "../helpers/agregarPermisoUsuario";
import eliminarPermisoUsuario from "../helpers/eliminarPermisoUsuario";
import { ROLES_ID } from "../enum/roles.enum";

export const getCampos = async (req: Request, res: Response) => {
  try {
    const campo = await Campo.findAll({
      where: {
        estado: true,
      },
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

  const { idObreroEncargado, idObreroEncargadoDos, congregacion_id } = req.body;

  const transaction = await db.transaction();

  try {
    // Obtener el campo actual para comparar los obreros previos
    const campoActual = await Campo.findByPk(id, { transaction });

    if (!campoActual) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe un campo con el id ${id}`,
      });
    }

    const previousIdObreroEncargado =
      campoActual.getDataValue("idObreroEncargado");
    const previousIdObreroEncargadoDos = campoActual.getDataValue(
      "idObreroEncargadoDos",
    );

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
        },
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
        },
      );
    }

    const [numUpdated] = await Campo.update(
      {
        campo: body.campo,
        congregacion_id: congregacion_id,
        idObreroEncargado: idObreroEncargado,
        idObreroEncargadoDos:
          idObreroEncargadoDos !== undefined ? idObreroEncargadoDos : null,
      },
      { where: { id }, transaction },
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
          },
        );
      }
    }

    // Gestionar permisos de ObreroCampo si los obreros cambiaron
    if (
      idObreroEncargado !== undefined &&
      idObreroEncargado !== previousIdObreroEncargado
    ) {
      // Siempre eliminar permiso del obrero anterior si existía
      if (previousIdObreroEncargado) {
        await eliminarPermisoUsuario(
          previousIdObreroEncargado,
          ROLES_ID.OBRERO_CAMPO,
          transaction,
        );
      }

      // Agregar permiso al nuevo obrero (solo si no es null)
      if (idObreroEncargado) {
        await agregarPermisoUsuario(
          idObreroEncargado,
          ROLES_ID.OBRERO_CAMPO,
          transaction,
        );
      }
    }

    if (
      idObreroEncargadoDos !== undefined &&
      idObreroEncargadoDos !== previousIdObreroEncargadoDos
    ) {
      // Siempre eliminar permiso del obrero anterior si existía
      if (previousIdObreroEncargadoDos) {
        await eliminarPermisoUsuario(
          previousIdObreroEncargadoDos,
          ROLES_ID.OBRERO_CAMPO,
          transaction,
        );
      }

      // Agregar permiso al nuevo obrero (solo si no es null)
      if (idObreroEncargadoDos) {
        await agregarPermisoUsuario(
          idObreroEncargadoDos,
          ROLES_ID.OBRERO_CAMPO,
          transaction,
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
    console.error(error);
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

/**
 * GET /api/v1/campos
 * Endpoint REST para listar TODOS los campos de una congregación específica
 * Requiere autenticación por API Key (header X-API-KEY)
 */
export const getCamposPorCongregacion = async (req: Request, res: Response) => {
  try {
    // =======================================================================
    //                  VALIDACIÓN DE PARÁMETROS
    // =======================================================================

    const congregacionIdRaw = req.query.congregacion_id as string;

    if (!congregacionIdRaw) {
      return res.status(400).json({
        error: {
          code: "MISSING_REQUIRED_PARAM",
          message: "El parámetro congregacion_id es obligatorio",
          details: { param: "congregacion_id" },
        },
      });
    }

    const congregacion_id = parseInt(congregacionIdRaw, 10);

    if (isNaN(congregacion_id) || congregacion_id <= 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_PARAM",
          message:
            "El parámetro congregacion_id debe ser un número positivo válido",
          details: { param: "congregacion_id", value: congregacionIdRaw },
        },
      });
    }

    // =======================================================================
    //                  CONSULTA A BASE DE DATOS
    // =======================================================================

    const { count, rows } = await Campo.findAndCountAll({
      where: {
        congregacion_id: congregacion_id,
        estado: true,
      },
      order: [["campo", "ASC"]],
      attributes: [
        "id",
        "campo",
        "congregacion_id",
        "estado",
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
    console.error("Error en getCamposPorCongregacion:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener los campos",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
    });
  }
};
