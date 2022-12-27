import { Request, Response } from "express";
import db from "../database/connection";
import SupervisorCongregacion from "../models/supervisorCongregacion.model";

export const getFeligres = async (req: Request, res: Response) => {
  try {
    const solicitudDeAccesos = await SupervisorCongregacion.findAll({
      include: [
        {
          all: true,
        },
      ],

      order: db.col("id"),
    });

    res.json({
      ok: true,
      solicitudDeAccesos,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
