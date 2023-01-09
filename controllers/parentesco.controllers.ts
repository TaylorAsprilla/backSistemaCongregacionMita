import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Parentesco from "../models/parentesco.model";

export const getParentesco = async (req: Request, res: Response) => {
  try {
    const parentesco = await Parentesco.findAll({
      order: db.col("nombre"),
    });

    res.json({
      ok: true,
      parentesco,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnParentesco = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const parentesco = await Parentesco.findByPk(id);

    res.json({
      ok: true,
      parentesco,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearParentesco = async (req: Request, res: Response) => {
  const { nombre } = req.body;

  try {
    const existeParentesco = await Parentesco.findOne({
      where: { nombre: nombre },
    });
    if (existeParentesco) {
      return res.status(400).json({
        msg: `Ya existe un parentesco con el nombre: ${nombre}`,
      });
    }

    const parentesco = await Parentesco.build(req.body);

    // Guardar Tipo de documento
    const parentescoCreado = await parentesco.save();

    res.json({
      ok: true,
      msg: `El parentesco ${nombre} ha sido creado satisfactoriamente`,
      parentescoCreado,
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
  const { nombre, ...campos } = body;

  try {
    const parentesco = await Parentesco.findByPk(id);
    if (!parentesco) {
      return res.status(404).json({
        msg: `No existe un parentesco con el id ${id}`,
      });
    }

    const getNombre = await parentesco.get().estudio;

    // Actualizaciones
    if (getNombre !== body.nombre) {
      const existeNombre = await Parentesco.findOne({
        where: {
          nombre: body.nombre,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un parentesco con el nombre ${nombre}`,
        });
      }
    }

    campos.nombre = nombre;

    // Se actualiza el campo
    const parentescoActualizado = await parentesco.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Parentesco Actualizado",
      parentescoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarParentesco = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const parentesco = await Parentesco.findByPk(id);
    if (parentesco) {
      const nombre = await parentesco.get().nombre;

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
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarParentesco = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const parentesco = await Parentesco.findByPk(id);
    if (!!parentesco) {
      const nombre = await parentesco.get().nombre;

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
          msg: `El parentesco ${nombre} está activo`,
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
