import { Request, Response } from "express";
import db from "../database/connection";
import Pais from "../models/pais.model";

export const getPais = async (req: Request, res: Response) => {
  try {
    const pais = await Pais.findAll({
      order: db.col("pais"),
    });

    res.json({
      ok: true,
      pais,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearPais = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Actividad
    // =======================================================================

    const pais = Pais.build(body);
    await pais.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la actividad exitosamente ",
      pais,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarPais = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const pais = await Pais.findByPk(id);
    if (!pais) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un pais con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Pais
    // =======================================================================

    const paisActualizado = await pais.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Pais Actualizado",
      paisActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
