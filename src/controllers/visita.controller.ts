import { Request, Response } from "express";
import Visita from "../models/visita.model";
import { obtenerInformeAutorizado } from "../helpers/informe-autorizado";

export const getVisitasPorInforme = async (req: Request, res: Response) => {
  const { informeId } = req.params;

  try {
    const informe = await obtenerInformeAutorizado(req, informeId);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeId}`,
      });
    }

    const visitas = await Visita.findAll({
      where: { informe_id: informeId, estado: true },
    });

    return res.json({
      ok: true,
      visitas,
      msg: "Visitas registradas",
    });
  } catch (error) {
    return res.status(500).json({ msg: "Hable con el administrador", error });
  }
};

export const getVisitas = async (req: Request, res: Response) => {
  try {
    const visitas = await Visita.findAll();

    res.json({
      ok: true,
      visitas,
      msg: "Visitas registradas",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnaVisita = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const visita = await Visita.findByPk(id);

    if (!visita) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una visita con el id ${id}`,
      });
    }

    res.json({
      ok: true,
      visita,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearVisita = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Visita
    // =======================================================================

    const visita = Visita.build(body);
    await visita.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el informe de visitas exitosamente ",
      visita,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarVisita = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const visita = await Visita.findByPk(id);
    if (!visita) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una visita con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Visita
    // =======================================================================

    const visitaActualizada = await visita.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Visita Actualizada",
      visitaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarVisita = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const visita = await Visita.findByPk(id);
    if (!visita) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una visita con el id ${id}`,
      });
    }

    // Eliminación lógica - cambiar estado a false
    await visita.update({ estado: false });

    res.json({
      ok: true,
      msg: "Visita eliminada",
      id,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
