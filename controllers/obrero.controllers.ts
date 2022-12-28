import { Request, Response } from "express";
import db from "../database/connection";
import { MINISTERIOS } from "../enum/ministerios.enum";
import Ministerio from "../models/ministerio.model";
import Usuario from "../models/usuario.model";

export const getObreros = async (req: Request, res: Response) => {
  const obreros = await Usuario.findAll({
    include: {
      model: Ministerio,
      as: "usuarioMinisterio",
      through: {
        attributes: [],
      },
      where: {
        ministerio: MINISTERIOS.OBRERO,
      },
    },
    order: db.col("primerNombre"),
  });

  res.json({
    ok: true,
    obreros,
  });
};
