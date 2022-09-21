import { Request, Response } from "express";
import db from "../database/connection";
import Direccion from "../models/direccion.model";

export const getDirecciones = async (req: Request, res: Response) => {
  try {
    const direcciones = await Direccion.findAll({
      order: db.col("direccion"),
    });

    res.json({
      ok: true,
      direcciones,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getDireccion = async (req: Request, res: Response) => {
  const { id } = req.params;

  const direccion = await Direccion.findByPk(id);

  if (direccion) {
    res.json({
      ok: true,
      direccion,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe la dirección con el id ${id}`,
    });
  }
};

export const crearDireccion = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Dirección
    // =======================================================================

    const direccion = Direccion.build(body);
    await direccion.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la dirección exitosamente ",
      direccion,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarDireccion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const direccion = await Direccion.findByPk(id);
    if (!direccion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una direccion con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Direccion
    // =======================================================================

    const direccionActualizada = await direccion.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Dirección Actualizada",
      direccionActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
