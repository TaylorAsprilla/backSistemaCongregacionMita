import { Request, Response } from "express";
import SituacionVisita from "../models/situacionVisita.model";
import { obtenerInformeAutorizado } from "../helpers/informe-autorizado";

export const getSituacionVisitaPorInforme = async (
  req: Request,
  res: Response,
) => {
  const { informeId } = req.params;

  try {
    const informe = await obtenerInformeAutorizado(req, informeId);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeId}`,
      });
    }

    const situacionVisitas = await SituacionVisita.findAll({
      where: { informe_id: informeId },
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.json({
      ok: true,
      situacionVisitas,
      msg: "Situaciones de visitas registradas",
    });
  } catch (error) {
    return res.status(500).json({ msg: "Hable con el administrador", error });
  }
};

export const getSituacionVisita = async (req: Request, res: Response) => {
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
  res: Response,
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

export const eliminarSituacionVisita = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const situacionVisita = await SituacionVisita.findByPk(id);
    if (!situacionVisita) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una situación visita con el id ${id}`,
      });
    }

    const informe = await obtenerInformeAutorizado(
      req,
      situacionVisita.getDataValue("informe_id").toString(),
    );
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: "No existe el informe asociado o no pertenece al usuario autenticado",
      });
    }

    await situacionVisita.destroy();

    return res.json({
      ok: true,
      msg: "Situación de la visita eliminada",
      id,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
