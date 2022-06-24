import { Request, Response } from "express";
import db from "../database/connection";
import RolCasa from "../models/rolCasa.model";

export const getRolCasa = async (req: Request, res: Response) => {
  try {
    const rolCasa = await RolCasa.findAll({
      order: db.col("rolCasa"),
    });

    res.json({
      ok: true,
      rolCasa,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearRolCasa = async (req: Request, res: Response) => {
  const { rolCasa } = req.body;

  try {
    const existeRolCasa = await RolCasa.findOne({
      where: { rolCasa: rolCasa },
    });
    if (existeRolCasa) {
      return res.status(400).json({
        msg: `Ya existe un rol en casa con el nombre: ${rolCasa}`,
      });
    }

    const crearRolCasa = await RolCasa.build(req.body);

    const rolCasaCreado = await crearRolCasa.save();

    res.json({
      ok: true,
      msg: `El rol en casa ${rolCasa} se creó satisfactoriamente`,
      rolCasaCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarRolCasa = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { rolCasa, ...campos } = body;

  try {
    const rolCasa = await RolCasa.findByPk(id);
    if (!rolCasa) {
      return res.status(404).json({
        msg: `No existe un rol en casa con el id ${id}`,
      });
    }

    const getNombre = await rolCasa.get().rolCasa;

    // Actualizaciones
    if (getNombre !== body.rolCasa) {
      const existeNombre = await RolCasa.findOne({
        where: {
          rolCasa: body.rolCasa,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un rol en casa con el nombre ${getNombre}`,
        });
      }
    }

    // Se actualiza el campo
    const rolCasaActualizado = await rolCasa.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Rol en casa actualizado",
      rolCasaActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
