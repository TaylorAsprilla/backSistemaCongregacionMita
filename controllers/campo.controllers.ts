import { Request, Response } from "express";
import db from "../database/connection";
import Campo from "../models/campo.model";

export const getCampo = async (req: Request, res: Response) => {
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

  try {
    const campo = await Campo.findByPk(id);
    if (!campo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un campo con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Campo
    // =======================================================================

    const campoActualizado = await campo.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Campo Actualizada",
      campoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
