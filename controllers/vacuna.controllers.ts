import { Request, Response } from "express";
import db from "../database/connection";
import Vacuna from "../models/vacuna.model";

export const getVacuna = async (req: Request, res: Response) => {
  try {
    const vacuna = await Vacuna.findAll({
      order: db.col("vacuna"),
    });

    res.json({
      ok: true,
      vacuna,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearVacuna = async (req: Request, res: Response) => {
  const { vacuna } = req.body;

  try {
    const existeVacuna = await Vacuna.findOne({
      where: { vacuna: vacuna },
    });
    if (existeVacuna) {
      return res.status(400).json({
        msg: `Ya existe una vacuna con el nombre: ${vacuna}`,
      });
    }

    const crearVacuna = await Vacuna.build(req.body);

    const vacunaCreada = await crearVacuna.save();

    res.json({
      ok: true,
      msg: `La vacuna ${vacuna} se creó satisfactoriamente`,
      vacunaCreada,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarVacuna = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { vacuna, ...campos } = body;

  try {
    const vacuna = await Vacuna.findByPk(id);
    if (!vacuna) {
      return res.status(404).json({
        msg: `No existe una vacuna con el id ${id}`,
      });
    }

    const getNombre = await vacuna.get().vacuna;

    // Actualizaciones
    if (getNombre !== body.vacuna) {
      const existeNombre = await Vacuna.findOne({
        where: {
          vacuna: body.vacuna,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe una vacuna con el nombre ${getNombre}`,
        });
      }
    }

    // Se actualiza el campo
    const vacunaActualizada = await vacuna.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Vacuna actualizada",
      vacunaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
