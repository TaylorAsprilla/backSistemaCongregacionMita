import { Request, Response } from "express";
import db from "../database/connection";
import LinkEvento from "../models/linkEvento.model";

export const getLinkEventos = async (req: Request, res: Response) => {
  try {
    const linkEvento = await LinkEvento.findAll({
      order: db.col("id"),
    });

    res.json({
      ok: true,
      linkEvento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearLinkEvento = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Actividad
    // =======================================================================

    const linkEvento = LinkEvento.build(body);
    await linkEvento.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el evento exitosamente ",
      linkEvento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
