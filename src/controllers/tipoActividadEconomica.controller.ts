import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoActividadEconomica from "../models/tipoActividadEconomica.model";

export const getTipoActividadEconomica = async (
  req: Request,
  res: Response,
) => {
  try {
    const tipoActividadEconomica = await TipoActividadEconomica.findAll({
      order: db.col("nombre"),
    });

    res.json({
      ok: true,
      tipoActividadEconomica: tipoActividadEconomica,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoActividadEconomica = async (
  req: Request,
  res: Response,
) => {
  const { nombre } = req.body;

  try {
    const existeTipoActividadEconomica = await TipoActividadEconomica.findOne({
      where: { nombre: nombre },
    });
    if (existeTipoActividadEconomica) {
      return res.status(400).json({
        msg:
          "Ya existe un Tipo de actividad económica con el nombre: " + nombre,
      });
    }

    const tipoActividadEconomica = await TipoActividadEconomica.build(req.body);

    // Guardar Tipo de actividad económica
    const tipoActividadEconomicaCreado = await tipoActividadEconomica.save();

    res.json({
      ok: true,
      msg: `El tipo de actividad económica ${nombre} fue creado satisfactoriamente`,
      tipoActividadEconomicaCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoActividadEconomica = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  const { body } = req;
  const { nombre, ...campos } = body;

  try {
    const tipoActividadEconomica = await TipoActividadEconomica.findByPk(id);
    if (!tipoActividadEconomica) {
      return res.status(404).json({
        msg: "No existe un tipo de actividad económica con el id " + id,
      });
    }

    const getNombre = await tipoActividadEconomica.get().nombre;

    // Actualizaciones
    if (getNombre !== body.nombre) {
      const existeNombre = await TipoActividadEconomica.findOne({
        where: {
          nombre: body.nombre,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg:
            "Ya existe un Tipo de actividad económica con el nombre " + nombre,
        });
      }
    }

    campos.nombre = nombre;

    // Se actualiza el campo
    const tipoActividadEconomicaActualizado =
      await tipoActividadEconomica.update(campos, {
        new: true,
      });

    res.json({
      ok: true,
      msg: "Tipo de actividad económica actualizada",
      tipoActividadEconomicaActualizado: tipoActividadEconomicaActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoActividadEconomica = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const tipoActividadEconomica = await TipoActividadEconomica.findByPk(id);
    if (tipoActividadEconomica) {
      const nombre = await tipoActividadEconomica.get().nombre;

      await tipoActividadEconomica.update({ estado: false });

      res.json({
        ok: true,
        msg: "El tipo de actividad económica " + nombre + " se eliminó ",
        id,
      });
    }

    if (!tipoActividadEconomica) {
      return res.status(404).json({
        msg: "No existe un tipo de actividad económica con el id " + id,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
