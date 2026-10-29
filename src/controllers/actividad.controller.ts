import { Request, Response } from "express";
import Actividad from "../models/actividad.model";
import {
  obtenerInformeAutorizado,
  obtenerInformeEditable,
} from "../helpers/informe-autorizado";

export const getActividadPorInforme = async (req: Request, res: Response) => {
  const { informeId } = req.params;

  try {
    const informe = await obtenerInformeAutorizado(req, informeId);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeId}`,
      });
    }

    const atividad = await Actividad.findAll({
      where: { informe_id: informeId },
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.json({
      ok: true,
      atividad,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Hable con el administrador - ",
      error,
    });
  }
};

export const getActividad = async (req: Request, res: Response) => {
  try {
    const atividad = await Actividad.findAll({
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.json({
      ok: true,
      atividad,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador - ",
      error,
    });
  }
};

export const getUnaActividad = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const actividad = await Actividad.findByPk(id);

    res.json({
      ok: true,
      actividad,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearActividad = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    const informe = await obtenerInformeEditable(req, String(body.informe_id));
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${body.informe_id}`,
      });
    }

    // =======================================================================
    //                          Guardar Actividad
    // =======================================================================

    // Convertir cadenas vacías a null para campos numéricos
    if (body.cantidadRecaudada === "" || body.cantidadRecaudada === undefined) {
      body.cantidadRecaudada = null;
    }

    const actividad = Actividad.build(body);
    await actividad.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la actividad exitosamente ",
      actividad,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarActividad = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const actividad = await Actividad.findByPk(id);
    if (!actividad) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una actividad con el id ${id}`,
      });
    }

    const informeIdActual = actividad.getDataValue("informe_id");
    if (
      body.informe_id !== undefined &&
      String(body.informe_id) !== String(informeIdActual)
    ) {
      return res.status(400).json({
        ok: false,
        msg: "No se puede cambiar el informe asociado a una actividad.",
      });
    }

    const informe = await obtenerInformeEditable(req, String(informeIdActual));
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeIdActual}`,
      });
    }

    // =======================================================================
    //                          Actualizar Actividad
    // =======================================================================

    // Convertir cadenas vacías a null para campos numéricos
    if (body.cantidadRecaudada === "" || body.cantidadRecaudada === undefined) {
      body.cantidadRecaudada = null;
    }

    const actividadActualizada = await actividad.update(body, { new: true });
    res.json({ ok: true, msg: "Actividad Actualizada", actividadActualizada });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarActividad = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const actividad = await Actividad.findByPk(id);
    if (!actividad) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una actividad con el id ${id}`,
      });
    }

    const informeId = actividad.getDataValue("informe_id");
    const informe = await obtenerInformeEditable(req, String(informeId));
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeId}`,
      });
    }

    await actividad.destroy();
    return res.json({
      ok: true,
      msg: "Actividad eliminada",
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
