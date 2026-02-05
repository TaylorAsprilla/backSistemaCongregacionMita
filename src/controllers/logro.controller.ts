import { Request, Response } from "express";
import Logro from "../models/logro.model";

export const getLogros = async (req: Request, res: Response) => {
  try {
    const logros = await Logro.findAll();

    res.json({
      ok: true,
      logros,
      msg: "Logros registrados",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearLogro = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Logro
    // =======================================================================

    const logro = Logro.build(body);
    await logro.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el logro exitosamente ",
      actividad: logro,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarLogro = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const logro = await Logro.findByPk(id);
    if (!logro) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un logro con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Logro
    // =======================================================================

    const logroActualizado = await logro.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Logro Actualizado",
      logroActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarLogro = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const logro = await Logro.findByPk(id);
    if (!logro) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un logro con el id ${id}`,
      });
    }

    // Eliminación lógica - cambiar estado a false
    await logro.update({ estado: false });

    res.json({
      ok: true,
      msg: "Logro eliminado",
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
