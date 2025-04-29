import { Request, Response } from "express";
import AsuntoPendiente from "../models/asuntoPendiente.model";

export const getAsuntoPendientes = async (req: Request, res: Response) => {
  try {
    const asuntosPendientes = await AsuntoPendiente.findAll();

    res.json({
      ok: true,
      asuntosPendientes,
      msg: "Asuntos pendientes registrados",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearAsuntoPendiente = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Asunto pendiente
    // =======================================================================

    const asuntoPendiente = AsuntoPendiente.build(body);
    await asuntoPendiente.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el asunto pendiente exitosamente ",
      actividad: asuntoPendiente,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarAsuntoPendiente = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const asuntoPendiente = await AsuntoPendiente.findByPk(id);
    if (!asuntoPendiente) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un asunto pendiente con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Asunto Pendiente
    // =======================================================================

    const asuntoPendienteActualizado = await asuntoPendiente.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Asunto pendiente actualizado",
      asuntoPendienteActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
