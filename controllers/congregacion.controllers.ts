import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Congregacion from "../models/congregacion.model";

export const getCongregaciones = async (req: Request, res: Response) => {
  try {
    const congregacion = await Congregacion.findAll({
      order: db.col("congregacion"),
    });

    res.json({
      ok: true,
      congregacion,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getCongregacion = async (req: Request, res: Response) => {
  const { id } = req.params;

  const congregacion = await Congregacion.findByPk(id);

  if (congregacion) {
    res.json({
      ok: true,
      congregacion,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe la congregación con el id ${id}`,
    });
  }
};

export const crearCongregacion = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Congregación
    // =======================================================================

    const congregacion = Congregacion.build(body);
    await congregacion.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la congregacion exitosamente ",
      congregacion,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarCongregacion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const congregacion = await Congregacion.findByPk(id);
    if (!congregacion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una congregación con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Congregación
    // =======================================================================

    const congregacionActualizada = await congregacion.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Congregación Actualizada",
      congregacionActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarCongregacion = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const congregacion = await Congregacion.findByPk(id);
    if (congregacion) {
      const nombre = await congregacion.get().congregacion;

      await congregacion.update({ estado: false });

      res.json({
        ok: true,
        msg: `La Congregación ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!congregacion) {
      return res.status(404).json({
        msg: `No existe una congregación con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarCongregacion = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const congregacion = await Congregacion.findByPk(id);
    if (!!congregacion) {
      const nombre = await congregacion.get().congregacion;

      if (congregacion.get().estado === false) {
        await congregacion.update({ estado: true });
        res.json({
          ok: true,
          msg: `La Congregación ${nombre} se activó`,
          congregacion,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La congregacion ${nombre} esta activa`,
          congregacion,
        });
      }
    }

    if (!congregacion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una congregación con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
