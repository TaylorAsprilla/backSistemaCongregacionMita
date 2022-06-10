import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoStatus from "../models/tipoStatus,model";

export const getTipostatus = async (req: Request, res: Response) => {
  try {
    const tipoStatus = await TipoStatus.findAll({
      order: db.col("status"),
    });

    res.json({
      ok: true,
      tipoStatus,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipostatus = async (req: Request, res: Response) => {
  const { status } = req.body;

  try {
    const existeTipoStatus = await TipoStatus.findOne({
      where: { status: status },
    });
    if (existeTipoStatus) {
      return res.status(400).json({
        msg: "Ya existe un Tipo de estatus con el nombre: " + status,
      });
    }

    const tipoStatus = await TipoStatus.build(req.body);

    // Guardar Tipo de Status
    const tipoStatusCreado = await tipoStatus.save();

    res.json({
      ok: true,
      msg: `El tipo de status ${status} fue creado satisfactoriamente`,
      tipoStatusCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoStatus = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { status, ...campos } = body;

  try {
    const tipostatus = await TipoStatus.findByPk(id);
    if (!tipostatus) {
      return res.status(404).json({
        msg: `No existe un tipo de status con el id ${id}`,
      });
    }

    const getNombre = await tipostatus.get().status;

    // Actualizaciones
    if (getNombre !== body.status) {
      const existeStatus = await TipoStatus.findOne({
        where: {
          status: body.status,
        },
      });
      if (existeStatus) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un Tipo de estatus con el nombre ${status}`,
        });
      }
    }

    campos.status = status;

    // Se actualiza el campo
    const tipoStatusActualizado = await tipostatus.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de Status actualizado",
      tipoStatusActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoStatus = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const tipoStatus = await TipoStatus.findByPk(id);
    if (tipoStatus) {
      const status = await tipoStatus.get().status;

      await tipoStatus.update({ estado: false });

      res.json({
        ok: true,
        msg: `El tipo de status ${status} se eliminó`,
        id,
      });
    }

    if (!tipoStatus) {
      return res.status(404).json({
        msg: `No existe un tipo de status con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};
