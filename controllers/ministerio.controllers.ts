import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Ministerio from "../models/ministerio.model";

export const getMinisterio = async (req: Request, res: Response) => {
  try {
    const ministerio = await Ministerio.findAll({
      order: db.col("ministerio"),
    });

    res.json({
      ok: true,
      ministerio,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnMinisterio = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const ministerio = await Ministerio.findByPk(id);

    res.json({
      ok: true,
      ministerio,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearMinisterio = async (req: Request, res: Response) => {
  const { ministerio } = req.body;

  try {
    const existeMinisterio = await Ministerio.findOne({
      where: { ministerio: ministerio },
    });
    if (existeMinisterio) {
      return res.status(400).json({
        msg: "Ya existe un ministerio con el nombre: " + ministerio,
      });
    }

    const ministerioNuevo = await Ministerio.build(req.body);

    // Guardar Tipo de documento
    const ministerioCreado = await ministerioNuevo.save();

    res.json({
      ok: true,
      msg: `El ministerio ${ministerioNuevo} creado satisfactoriamente`,
      ministerioCreado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarMinisterio = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { ministerio, ...campos } = body;

  try {
    const ministerio = await Ministerio.findByPk(id);
    if (!ministerio) {
      return res.status(404).json({
        msg: "No existe un ministerio con el id " + id,
      });
    }

    const getNombre = await ministerio.get().ministerio;

    // Actualizaciones
    if (getNombre !== body.ministerio) {
      const existeNombre = await Ministerio.findOne({
        where: {
          ministerio: body.ministerio,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: "Ya existe un ministerio con el nombre " + ministerio,
        });
      }
    }

    campos.ministerio = ministerio;

    // Se actualiza el campo
    const ministerioActualizado = await ministerio.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Ministerio actualizado",
      ministerioActualizado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarMinisterio = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const ministerio = await Ministerio.findByPk(id);
    if (ministerio) {
      const nombre = await ministerio.get().ministerio;

      await ministerio.update({ estado: false });

      res.json({
        ok: true,
        msg: "El ministerio " + nombre + " se elimin?? ",
        id: req.id,
      });
    }

    if (!ministerio) {
      return res.status(404).json({
        msg: "No existe un ministerio con el id " + id,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};
