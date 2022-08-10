import { Request, Response } from "express";
import db from "../database/connection";
import Nacionalidad from "../models/nacionalidad.model";

export const getNacionalidades = async (req: Request, res: Response) => {
  try {
    const nacionalidades = await Nacionalidad.findAll({
      order: db.col("nombre"),
    });

    res.json({
      ok: true,
      nacionalidades,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getNacionalidad = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const nacionalidad = await Nacionalidad.findByPk(id);

    res.json({
      ok: true,
      nacionalidad,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
