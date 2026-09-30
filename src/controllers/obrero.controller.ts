import { Request, Response } from "express";
import db from "../database/connection";
import { MINISTERIOS } from "../enum/ministerios.enum";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";
import Ministerio from "../models/ministerio.model";
import Usuario from "../models/usuario.model";

export const getObreros = async (req: Request, res: Response) => {
  const obreros = await Usuario.findAll({
    where: {
      estado: ESTADO_USUARIO_ENUM.ACTIVO,
    },
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
