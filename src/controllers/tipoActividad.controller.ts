import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoActividadEclesiastico from "../models/tipoActividadEclesiastico.model";

export const getTipoActividad = async (req: Request, res: Response) => {
  try {
    const tipoActividad = await TipoActividadEclesiastico.findAll({
      order: db.col("nombre"),
    });

    res.json({
      ok: true,
      tipoActividad: tipoActividad,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoActividad = async (req: Request, res: Response) => {
  const { nombre } = req.body;

  try {
    const existeTipoActividad = await TipoActividadEclesiastico.findOne({
      where: { nombre: nombre },
    });
    if (existeTipoActividad) {
      return res.status(400).json({
        msg: "Ya existe un Tipo de actividad con el nombre: " + nombre,
      });
    }

    const tipoActividad = await TipoActividadEclesiastico.build(req.body);

    // Guardar Tipo de documento
    const tipoActividadCreado = await tipoActividad.save();

    res.json({
      ok: true,
      msg: `El tipo de actividad ${nombre} fue creado satisfactoriamente`,
      tipoActividadCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoActividad = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { nombre, ...campos } = body;

  try {
    const tipoActividad = await TipoActividadEclesiastico.findByPk(id);
    if (!tipoActividad) {
      return res.status(404).json({
        msg: "No existe un tipo de actividad con el id " + id,
      });
    }

    const getNombre = await tipoActividad.get().nombre;

    // Actualizaciones
    if (getNombre !== body.nombre) {
      const existeNombre = await TipoActividadEclesiastico.findOne({
        where: {
          nombre: body.nombre,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: "Ya existe un Tipo de actividad con el nombre " + nombre,
        });
      }
    }

    campos.nombre = nombre;

    // Se actualiza el campo
    const tipoActividadActualizado = await tipoActividad.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de actividad actualizada",
      tipoDocumentoActualizado: tipoActividadActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoActividad = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const tipoActividad = await TipoActividadEclesiastico.findByPk(id);
    if (tipoActividad) {
      const nombre = await tipoActividad.get().nombre;

      await tipoActividad.update({ estado: false });

      res.json({
        ok: true,
        msg: "El tipo de actividad " + nombre + " se eliminó ",
        id,
      });
    }

    if (!tipoActividad) {
      return res.status(404).json({
        msg: "No existe un tipo de actividad con el id " + id,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
