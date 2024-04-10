import { Request, Response } from "express";
import db from "../database/connection";
import Usuario from "../models/usuario.model";
import Pais from "../models/pais.model";
import Congregacion from "../models/congregacion.model";
import Campo from "../models/campo.model";

export const getFeligreses = async (req: Request, res: Response) => {
  const { id } = req.params;

  //TODO queda pendiente por terminar.

  try {
    // Validar si idusuario es un número válido
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del usuario no es válido.",
      });
    }

    // Buscar la congregación del obrero encargado con el ID proporcionado
    const pais = await Pais.findOne({
      where: { idObreroEncargado: id },
    });

    if (!pais) {
      return res.status(404).json({
        message: "El obrero no tiene congregación a cargo",
      });
    }

    // Obtener todos los usuarios asociados a esta congregación
    const { count, rows } = await Usuario.findAndCountAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "apodo",
        "fechaNacimiento",
        "email",
        "numeroCelular",
        "estado",
      ],
      include: [
        {
          model: Pais,
          as: "usuarioCongregacionPais",
          attributes: ["pais"],
          where: { id: id },
        },
        {
          model: Congregacion,
          as: "usuarioCongregacionCongregacion",

          attributes: ["congregacion"],
        },
        {
          model: Campo,
          as: "usuarioCongregacionCampo",
          attributes: ["campo"],
        },
      ],
    });
    res.json({
      ok: true,
      feligres: rows,
      totalUsuarios: count,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
