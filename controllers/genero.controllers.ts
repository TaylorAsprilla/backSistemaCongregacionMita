import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Genero from "../models/genero.model";

export const getGenero = async (req: Request, res: Response) => {
  try {
    const genero = await Genero.findAll({
      order: db.col("genero"),
    });

    res.json({
      ok: true,
      genero,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearGenero = async (req: Request, res: Response) => {
  const { genero } = req.body;

  try {
    const existeGenero = await Genero.findOne({
      where: { genero: genero },
    });
    if (existeGenero) {
      return res.status(400).json({
        msg: "Ya existe un género con el nombre: " + genero,
      });
    }

    const crearGenero = await Genero.build(req.body);

    // Guardar Tipo de documento
    const generoCreado = await crearGenero.save();

    res.json({
      ok: true,
      msg: `El género ${genero} se creó satisfactoriamente`,
      generoCreado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarGenero = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { genero, ...campos } = body;

  try {
    const genero = await Genero.findByPk(id);
    if (!genero) {
      return res.status(404).json({
        msg: "No existe un género con el id " + id,
      });
    }

    const getNombre = await genero.get().genero;

    // Actualizaciones
    if (getNombre !== body.genero) {
      const existeNombre = await Genero.findOne({
        where: {
          genero: body.genero,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: "Ya existe un género con el nombre " + genero,
        });
      }
    }

    // Se actualiza el campo
    const generoActualizado = await genero.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de género actualizado",
      generoActualizado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarGenero = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const genero = await Genero.findByPk(id);
    if (genero) {
      const nombre = await genero.get().genero;

      await genero.update({ estado: false });

      res.json({
        ok: true,
        msg: "El género " + nombre + " se eliminó ",
        id: req.id,
      });
    }

    if (!genero) {
      return res.status(404).json({
        msg: "No existe un género con el id " + id,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};
