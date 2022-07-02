import { Request, Response } from "express";
import db from "../database/connection";
import Congregacion from "../models/congregacion.model";

export const getCongregacion = async (req: Request, res: Response) => {
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

  try {
    const congregacion = await Congregacion.findByPk(id);
    if (!congregacion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una congregación con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Congregación
    // =======================================================================

    const congregacionActualizada = await congregacion.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Congregación Actualizada",
      congregacionActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
