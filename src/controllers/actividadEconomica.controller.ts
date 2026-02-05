import { Request, Response } from "express";
import db from "../database/connection";
import ActividadEconomica from "../models/actividadEconomica.model";

export const getActividadEconomica = async (req: Request, res: Response) => {
  try {
    const actividadEconomica = await ActividadEconomica.findAll({
      order: db.col("fecha"),
    });

    res.json({
      ok: true,
      actividadEconomica,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador - ",
      error,
    });
  }
};

export const getUnaActividadEconomica = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const actividadEconomica = await ActividadEconomica.findByPk(id);

    res.json({
      ok: true,
      actividadEconomica,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearActividadEconomica = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Actividad Económica
    // =======================================================================

    // Convertir cadenas vacías a null para campos numéricos
    if (body.cantidadRecaudada === "" || body.cantidadRecaudada === undefined) {
      body.cantidadRecaudada = null;
    }

    const actividadEconomica = ActividadEconomica.build(body);
    await actividadEconomica.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la actividad económica exitosamente ",
      actividadEconomica,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarActividadEconomica = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const actividadEconomica = await ActividadEconomica.findByPk(id);
    if (!actividadEconomica) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una actividad económica con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Actividad Económica
    // =======================================================================

    // Convertir cadenas vacías a null para campos numéricos
    if (body.cantidadRecaudada === "" || body.cantidadRecaudada === undefined) {
      body.cantidadRecaudada = null;
    }

    const actividadEconomicaActualizada = await actividadEconomica.update(
      body,
      { new: true },
    );
    res.json({
      ok: true,
      msg: "Actividad Económica Actualizada",
      actividadEconomicaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarActividadEconomica = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const actividadEconomica = await ActividadEconomica.findByPk(id);
    if (!actividadEconomica) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una actividad económica con el id ${id}`,
      });
    }

    await actividadEconomica.destroy();

    res.json({
      ok: true,
      msg: "Actividad económica eliminada",
      id,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
