import { Request, Response } from "express";
import db from "../database/connection";
import Divisa from "../models/divisa.model";

export const getDivisa = async (req: Request, res: Response) => {
  try {
    const divisa = await Divisa.findAll({
      order: db.col("divisa"),
    });

    res.json({
      ok: true,
      divisa,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearDivisa = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Divisa
    // =======================================================================

    const divisa = Divisa.build(body);
    await divisa.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la divisa exitosamente ",
      divisa,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarDivisa = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const divisa = await Divisa.findByPk(id);
    if (!divisa) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una divisa con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Divisa
    // =======================================================================

    const divisaActualizada = await divisa.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Divisa Actualizada",
      divisaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
