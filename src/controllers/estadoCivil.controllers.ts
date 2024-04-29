import { Request, Response } from "express";
import db from "../database/connection";
import EstadoCivil from "../models/estadoCivil.model";
import { CustomRequest } from "../middlewares/validar-jwt";

export const getEstadoCivil = async (req: Request, res: Response) => {
  try {
    const estadoCivil = await EstadoCivil.findAll({
      order: db.col("estadoCivil"),
    });

    res.json({
      ok: true,
      estadoCivil,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearEstadoCivil = async (req: Request, res: Response) => {
  const { estadoCivil } = req.body;

  try {
    const existeEstadoCivil = await EstadoCivil.findOne({
      where: { estadoCivil: estadoCivil },
    });
    if (existeEstadoCivil) {
      return res.status(400).json({
        msg: `Ya existe un estado civil con el nombre: ${estadoCivil}`,
      });
    }

    const crearEstadoCivil = await EstadoCivil.build(req.body);

    const estadoCivilCreado = await crearEstadoCivil.save();

    res.json({
      ok: true,
      msg: `El estado civil ${estadoCivil} se creó satisfactoriamente`,
      estadoCivilCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarEstadoCivil = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { estadoCivil, ...campos } = body;

  try {
    const estadoCivil = await EstadoCivil.findByPk(id);
    if (!estadoCivil) {
      return res.status(404).json({
        msg: `No existe un estadoCivil con el id ${id}`,
      });
    }

    const getNombre = await estadoCivil.get().estadoCivil;

    // Actualizaciones
    if (getNombre !== body.estadoCivil) {
      const existeNombre = await EstadoCivil.findOne({
        where: {
          estadoCivil: body.estadoCivil,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un estadoCivil con el nombre ${getNombre}`,
        });
      }
    }

    // Se actualiza el campo
    const estadoCivilActualizado = await estadoCivil.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de género actualizado",
      estadoCivilActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarEstadoCivil = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const estadoCivil = await EstadoCivil.findByPk(id);
    if (estadoCivil) {
      const nombre = await estadoCivil.get().estadoCivil;

      await estadoCivil.update({ estado: false });

      res.json({
        ok: true,
        msg: "El estado civil " + nombre + " se eliminó ",
        id: req.id,
      });
    }

    if (!estadoCivil) {
      return res.status(404).json({
        msg: "No existe un estado civil con el id " + id,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarEstadoCivil = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const estadoCivil = await EstadoCivil.findByPk(id);
    if (!!estadoCivil) {
      const nombre = await estadoCivil.get().estadoCivil;

      if (estadoCivil.get().estado === false) {
        await estadoCivil.update({ estado: true });
        res.json({
          ok: true,
          msg: `El estado civil ${nombre} se activó`,
          estadoCivil: estadoCivil,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El estado civil ${nombre} está activo`,
          estadoCivil,
        });
      }
    }

    if (!estadoCivil) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un estado civil identificado con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
