import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoDocumento from "../models/tipoDocumento.model";

export const getTipoDocumento = async (req: Request, res: Response) => {
  try {
    const tipoDocumento = await TipoDocumento.findAll({
      order: db.col("documento"),
    });

    res.json({
      ok: true,
      tipoDocumento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnTipoDocumento = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tipoDocumento = await TipoDocumento.findByPk(id);

    res.json({
      ok: true,
      tipoDocumento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoDocumento = async (req: Request, res: Response) => {
  const { documento } = req.body;

  try {
    const existeTipoDocumento = await TipoDocumento.findOne({
      where: { documento: documento },
    });
    if (existeTipoDocumento) {
      return res.status(400).json({
        msg: "Ya existe un Tipo de documento con el nombre: " + documento,
      });
    }

    const tipoDocumento = await TipoDocumento.build(req.body);

    // Guardar Tipo de documento
    const tipoDocumentoCreado = await tipoDocumento.save();

    res.json({
      ok: true,
      msg: `El tipo de documento ${documento} creado satisfactoriamente`,
      tipoDocumentoCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoDocumento = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { documento, ...campos } = body;

  try {
    const tipoDocumento = await TipoDocumento.findByPk(id);
    if (!tipoDocumento) {
      return res.status(404).json({
        msg: "No existe un tipo de Documento con el id " + id,
      });
    }

    const getNombre = await tipoDocumento.get().documento;

    // Actualizaciones
    if (getNombre !== body.documento) {
      const existeNombre = await TipoDocumento.findOne({
        where: {
          documento: body.documento,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: "Ya existe un Tipo de documento con el nombre " + documento,
        });
      }
    }

    campos.documento = documento;

    // Se actualiza el campo
    const tipoDocumentoActualizado = await tipoDocumento.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de documento actualizado",
      tipoDocumentoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoDocumento = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const tipoDocumento = await TipoDocumento.findByPk(id);
    if (tipoDocumento) {
      const nombre = await tipoDocumento.get().documento;

      await tipoDocumento.update({ estado: false });

      res.json({
        ok: true,
        msg: "El tipo de documento " + nombre + " se eliminó ",
        id,
      });
    }

    if (!tipoDocumento) {
      return res.status(404).json({
        msg: "No existe un tipo de documento con el id " + id,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
