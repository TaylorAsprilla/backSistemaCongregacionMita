import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoEstudio from "../models/tipoEstudio.model";

export const getTipoEstudio = async (req: Request, res: Response) => {
  try {
    const tipoEstudio = await TipoEstudio.findAll({
      order: db.col("estudio"),
    });

    res.json({
      ok: true,
      tipoEstudio,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnTipoEstudio = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tipoEstudio = await TipoEstudio.findByPk(id);

    res.json({
      ok: true,
      tipoEstudio,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoEstudio = async (req: Request, res: Response) => {
  const { estudio } = req.body;

  try {
    const existeTipoEstudio = await TipoEstudio.findOne({
      where: { estudio: estudio },
    });
    if (existeTipoEstudio) {
      return res.status(400).json({
        msg: `Ya existe un Tipo de Estudio con el nombre: ${estudio}`,
      });
    }

    const tipoEstudio = await TipoEstudio.build(req.body);

    // Guardar Tipo de documento
    const tipoEstudioCreado = await tipoEstudio.save();

    res.json({
      ok: true,
      msg: `El tipo de usuario ${estudio} ha sido creado satisfactoriamente`,
      tipoEstudioCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoEstudio = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { estudio, ...campos } = body;

  try {
    const tipoEstudio = await TipoEstudio.findByPk(id);
    if (!tipoEstudio) {
      return res.status(404).json({
        msg: `No existe un tipo de estudio con el id ${id}`,
      });
    }

    const getNombre = await tipoEstudio.get().estudio;

    // Actualizaciones
    if (getNombre !== body.tipo) {
      const existeNombre = await TipoEstudio.findOne({
        where: {
          estudio: body.estudio,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un Tipo de Estudio con el nombre ${estudio}`,
        });
      }
    }

    campos.estudio = estudio;

    // Se actualiza el campo
    const tipoEstudioActualizado = await tipoEstudio.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de estudio actualizado",
      tipoEstudioActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoEstudio = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const tipoEstudio = await TipoEstudio.findByPk(id);
    if (tipoEstudio) {
      const nombre = await tipoEstudio.get().estudio;

      await tipoEstudio.update({ estado: false });

      res.json({
        ok: true,
        msg: `El tipo de estudio ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!tipoEstudio) {
      return res.status(404).json({
        msg: `No existe un tipo de estudio con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarTipoEstudio = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const tipoEstudio = await TipoEstudio.findByPk(id);
    if (!!tipoEstudio) {
      const nombre = await tipoEstudio.get().estudio;

      if (tipoEstudio.get().estado === false) {
        await tipoEstudio.update({ estado: true });
        res.json({
          ok: true,
          msg: `El tipo de estudio ${nombre} se activó`,
          tipoEstudio,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El tipo de estudio ${nombre} está activo`,
          tipoEstudio,
        });
      }
    }

    if (!tipoEstudio) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un tipo de estudio con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
