import { Request, Response } from "express";
import Meta from "../models/meta.model";

export const getMetas = async (req: Request, res: Response) => {
  try {
    const metas = await Meta.findAll();

    res.json({
      ok: true,
      metas,
      msg: "Metas registradas",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getMeta = async (req: Request, res: Response) => {
  const { id } = req.params;

  const meta = await Meta.findByPk(id);

  if (meta) {
    res.json({
      ok: true,
      meta,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe la meta con el id ${id}`,
    });
  }
};

export const crearMeta = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Meta
    // =======================================================================

    const meta = Meta.build(body);
    await meta.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la meta exitosamente ",
      actividad: meta,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarMeta = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const meta = await Meta.findByPk(id);
    if (!meta) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una meta con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Meta
    // =======================================================================

    const metaActualizada = await meta.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Meta Actualizada",
      metaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
