import { Request, Response } from "express";
import Contabilidad from "../models/contabilidad.model";

export const getContabilidad = async (req: Request, res: Response) => {
  try {
    const contabilidad = await Contabilidad.findAll();

    res.json({
      ok: true,
      contabilidad,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnaContabilidad = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const contabilidad = await Contabilidad.findByPk(id);

    res.json({
      ok: true,
      contabilidad,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearContabilidad = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Contabilidad
    // =======================================================================

    const contabilidad = Contabilidad.build(body);
    await contabilidad.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el informa contable exitosamente ",
      contabilidad,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarContabilidad = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const contabilidad = await Contabilidad.findByPk(id);
    if (!contabilidad) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un informa contable con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Contabilidad
    // =======================================================================

    const contabilidadActualizada = await contabilidad.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Informe contable actualizado",
      contabilidadActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
