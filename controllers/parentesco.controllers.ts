import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Parentesco from "../models/parentesco.model";

export const getParentescos = async (req: Request, res: Response) => {
  try {
    const parentescos = await Parentesco.findAll({
      order: db.col("parentesco"),
    });

    res.json({
      ok: true,
      parentescos,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getParentesco = async (req: Request, res: Response) => {
  const { id } = req.params;

  const parentesco = await Parentesco.findByPk(id);

  if (parentesco) {
    res.json({
      ok: true,
      pais: parentesco,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe el parentesco con el id ${id}`,
    });
  }
};

export const crearParentesco = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Parentesco
    // =======================================================================

    const parentesco = Parentesco.build(body);
    await parentesco.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el parentesco exitosamente ",
      parentesco,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarParentesco = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const parentesco = await Parentesco.findByPk(id);
    if (!parentesco) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un parentesco con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Parentesco
    // =======================================================================

    const parentescoActualizado = await parentesco.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Pais Actualizado",
      parentesco: parentescoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarParentesco = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const parentesco = await Parentesco.findByPk(id);
    if (parentesco) {
      const nombre = await parentesco.get().parentesco;

      await parentesco.update({ estado: false });

      res.json({
        ok: true,
        msg: `El parentesco ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!parentesco) {
      return res.status(404).json({
        msg: `No existe un parentesco con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarParentesco = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const parentesco = await Parentesco.findByPk(id);
    if (!!parentesco) {
      const nombre = await parentesco.get().parentesco;

      if (parentesco.get().estado === false) {
        await parentesco.update({ estado: true });
        res.json({
          ok: true,
          msg: `El parentesco ${nombre} se activó`,
          parentesco,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El parentesco ${nombre} esta activo`,
          parentesco,
        });
      }
    }

    if (!parentesco) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un parentesco con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
