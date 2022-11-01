import { Request, Response } from "express";
import { Op } from "sequelize";
import Usuario from "../models/usuario.model";

export const getTodo = async (req: Request, res: Response) => {
  const busqueda = req.params.busqueda;

  const resultadoUsuario = await Usuario.findAll({
    where: {
      [Op.or]: [
        {
          numeroCelular: { [Op.substring]: busqueda },
        },
        { email: { [Op.substring]: busqueda } },
      ],
    },
  });

  res.json({
    ok: true,
    msg: "Busqueda",
    resultadoUsuario,
  });
};
