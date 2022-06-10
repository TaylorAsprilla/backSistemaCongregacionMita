import { Request, Response } from "express";
import SituacionVisita from "../models/situacionVisita.model";

export const getsituacionVisita = async (req: Request, res: Response) => {
  try {
    const situacionVisitas = await SituacionVisita.findAll();

    res.json({
      ok: true,
      situacionVisitas,
      msg: "Situaciones de visitas registradas",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearSituacionVisita = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Situacion visita
    // =======================================================================

    const situacionVisita = SituacionVisita.build(body);
    await situacionVisita.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la situacion de la visita exitosamente ",
      situacionVisita,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarSituacionVisita = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const situacionVisita = await SituacionVisita.findByPk(id);
    if (!situacionVisita) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una situación visita con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar situación visita
    // =======================================================================

    const situacionVisitaActualizada = await situacionVisita.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Situación de la visita actualizada",
      situacionVisitaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
