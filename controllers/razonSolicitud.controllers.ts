import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import RazonSolicitud from "../models/razonSolicitud.model";

export const getRazonSolitudes = async (req: Request, res: Response) => {
  try {
    const razonSolicitud = await RazonSolicitud.findAll({
      order: db.col("solicitud"),
    });

    res.json({
      ok: true,
      razonSolicitud,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearUnaRazonSolicitud = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Razon Solicitud
    // =======================================================================

    const razonSolicitud = RazonSolicitud.build(body);
    await razonSolicitud.save();

    res.json({
      ok: true,
      msg: `Se ha guardado la razón de la solicitud exitosamente ${razonSolicitud}`,
      razonSolicitud,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarRazonSolicitud = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const razonSolicitud = await RazonSolicitud.findByPk(id);
    if (!razonSolicitud) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una razon de solicitud con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar la Razón de la Solicitud
    // =======================================================================

    const razonSolicitudActualizado = await razonSolicitud.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Razon de Solicitud de Acceso Actualizada",
      razonSolicitudActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarRazonSolicitud = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const razonSolicitud = await RazonSolicitud.findByPk(id);
    if (razonSolicitud) {
      const solicitud = await razonSolicitud.get().solicitud;

      await razonSolicitud.update({ estado: false });

      res.json({
        ok: true,
        msg: `La razon de la solicitud de acceso al canal de multiemdia ${solicitud} se eliminó`,
        id: id,
      });
    }

    if (!razonSolicitud) {
      return res.status(404).json({
        msg: `No existe una razon de solicitud de acceso con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarRazonSolicitud = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const razonSolicitud = await RazonSolicitud.findByPk(id);
    if (!!razonSolicitud) {
      const nombre = await razonSolicitud.get().solicitud;

      if (razonSolicitud.get().estado === false) {
        await razonSolicitud.update({ estado: true });
        res.json({
          ok: true,
          msg: `La razón de solicitud de acceso al canal de multimedia de ${nombre} se activó`,
          razonSolicitud,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La razón de solicitud de acceso al canal de multimedia de ${nombre} esta activo`,
          razonSolicitud,
        });
      }
    }

    if (!razonSolicitud) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una razón de solicitud de acceso al canal de multimedia de con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
