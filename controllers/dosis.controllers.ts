import { Request, Response } from "express";
import db from "../database/connection";
import Dosis from "../models/dosis.model";

export const getDosis = async (req: Request, res: Response) => {
  try {
    const dosis = await Dosis.findAll({
      order: db.col("dosis"),
    });

    res.json({
      ok: true,
      dosis,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearDosis = async (req: Request, res: Response) => {
  const { dosis } = req.body;

  try {
    const existeDosis = await Dosis.findOne({
      where: { dosis: dosis },
    });
    if (existeDosis) {
      return res.status(400).json({
        msg: `Ya existe la dosis con el nombre: ${dosis}`,
      });
    }

    const crearDosis = await Dosis.build(req.body);

    const dosisCreada = await crearDosis.save();

    res.json({
      ok: true,
      msg: `La dosis ${dosis} se creó satisfactoriamente`,
      dosisCreada,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarDosis = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { dosis, ...campos } = body;

  try {
    const dosis = await Dosis.findByPk(id);
    if (!dosis) {
      return res.status(404).json({
        msg: `No existe la dosis con el id ${id}`,
      });
    }

    const getNombre = await dosis.get().dosis;

    // Actualizaciones
    if (getNombre !== body.dosis) {
      const existeNombre = await Dosis.findOne({
        where: {
          dosis: body.dosis,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe una dosis con el nombre ${getNombre}`,
        });
      }
    }

    // Se actualiza el campo
    const dosisActualizada = await dosis.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Dosis actualizada",
      dosisActualizada,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
