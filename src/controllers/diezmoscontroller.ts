import { Request, Response } from "express";
import Diezmos from "../models/diezmos.model";
import { obtenerInformeAutorizado } from "../helpers/informe-autorizado";

export const getDiezmosPorInforme = async (req: Request, res: Response) => {
  const { informeId } = req.params;

  try {
    const informe = await obtenerInformeAutorizado(req, informeId);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeId}`,
      });
    }

    const diezmos = await Diezmos.findAll({
      where: { informe_id: informeId },
      order: [
        ["mes", "DESC"],
        ["id", "DESC"],
      ],
    });
    return res.json({ ok: true, diezmos });
  } catch (error) {
    return res.status(500).json({ msg: "Hable con el administrador", error });
  }
};

export const getDiezmos = async (req: Request, res: Response) => {
  try {
    const diezmos = await Diezmos.findAll({
      order: [
        ["mes", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.json({
      ok: true,
      diezmos,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnDiezmo = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const diezmo = await Diezmos.findByPk(id);

    res.json({
      ok: true,
      diezmo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearDiezmo = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Diezmo
    // =======================================================================

    const diezmo = Diezmos.build(body);
    await diezmo.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el informa contable exitosamente ",
      diezmo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarDiezmo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const diezmo = await Diezmos.findByPk(id);
    if (!diezmo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un informa contable con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Diezmo
    // =======================================================================

    const diezmoActualizado = await diezmo.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Informe contable actualizado",
      diezmoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
