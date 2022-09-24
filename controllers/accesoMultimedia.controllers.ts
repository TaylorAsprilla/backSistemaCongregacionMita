import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import AccesoMultimedia from "../models/accesoMultimedia.model";

export const getAccesoMultimedia = async (req: Request, res: Response) => {
  try {
    const solicitudDeAccesos = await AccesoMultimedia.findAll({
      order: db.col("id"),
    });

    res.json({
      ok: true,
      solicitudDeAccesos,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnAccesoMultimedia = async (req: Request, res: Response) => {
  const { id } = req.params;

  const solicitudDeAcceso = await AccesoMultimedia.findByPk(id);

  if (solicitudDeAcceso) {
    res.json({
      ok: true,
      solicitudDeAcceso,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe la solicitud con el id ${id}`,
    });
  }
};

export const crearAccesoMultimedia = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Acceso Multimedia
    // =======================================================================

    const solicitudDeAcceso = AccesoMultimedia.build(body);
    await solicitudDeAcceso.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la solicitud exitosamente ",
      solicitudDeAcceso,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarAccesoMultimedia = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await AccesoMultimedia.findByPk(id);
    if (!solicitudDeAcceso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una solicitud con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar la Solicitud de Accesos
    // =======================================================================

    const solicitudDeAccesoActualizado = await solicitudDeAcceso.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Solicitud de Acceso Actualizada",
      solicitudDeAccesoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarAccesoMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await AccesoMultimedia.findByPk(id);
    if (solicitudDeAcceso) {
      const nombre = await solicitudDeAcceso.get().nombre;

      await solicitudDeAcceso.update({ estado: false });

      res.json({
        ok: true,
        msg: `La solicitud de acceso al canal de multiemdia de ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!solicitudDeAcceso) {
      return res.status(404).json({
        msg: `No existe una solicitud de acceso con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarAccesoMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await AccesoMultimedia.findByPk(id);
    if (!!solicitudDeAcceso) {
      const nombre = await solicitudDeAcceso.get().nombre;

      if (solicitudDeAcceso.get().estado === false) {
        await solicitudDeAcceso.update({ estado: true });
        res.json({
          ok: true,
          msg: `La solicitud de acceso al canal de multiemdia de ${nombre} se activó`,
          solicitudDeAcceso,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La solicitud de acceso al canal de multiemdia de ${nombre} esta activo`,
          solicitudDeAcceso,
        });
      }
    }

    if (!solicitudDeAcceso) {
      return res.status(404).json({
        ok: false,
        msg: `No existeuna solicitud de acceso al canal de multiemdia de con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
