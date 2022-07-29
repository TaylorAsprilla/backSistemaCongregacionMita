import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Pais from "../models/pais.model";

export const getPaises = async (req: Request, res: Response) => {
  try {
    const pais = await Pais.findAll({
      order: db.col("pais"),
    });

    res.json({
      ok: true,
      pais,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getPais = async (req: Request, res: Response) => {
  const { id } = req.params;

  const pais = await Pais.findByPk(id);

  if (pais) {
    res.json({
      ok: true,
      pais,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe el país con el id ${id}`,
    });
  }
};

export const crearPais = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Actividad
    // =======================================================================

    const pais = Pais.build(body);
    await pais.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la actividad exitosamente ",
      pais,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarPais = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const pais = await Pais.findByPk(id);
    if (!pais) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un pais con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Pais
    // =======================================================================

    const paisActualizado = await pais.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Pais Actualizado",
      paisActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarPais = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const pais = await Pais.findByPk(id);
    if (pais) {
      const nombre = await pais.get().pais;

      await pais.update({ estado: false });

      res.json({
        ok: true,
        msg: `El país ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!pais) {
      return res.status(404).json({
        msg: `No existe un pías con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarPais = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const pais = await Pais.findByPk(id);
    if (!!pais) {
      const nombre = await pais.get().pais;

      if (pais.get().estado === false) {
        await pais.update({ estado: true });
        res.json({
          ok: true,
          msg: `El país ${nombre} se activó`,
          congregacion: pais,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El país ${nombre} esta activo`,
          congregacion: pais,
        });
      }
    }

    if (!pais) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un país con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
