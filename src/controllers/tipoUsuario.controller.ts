import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoUsuario from "../models/tipoUsuario.model";

export const getTipoUsuario = async (req: Request, res: Response) => {
  try {
    const tipoUsuario = await TipoUsuario.findAll({
      order: db.col("tipo"),
    });

    res.json({
      ok: true,
      tipoUsuario,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnTipoUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tipoUsuario = await TipoUsuario.findByPk(id);

    res.json({
      ok: true,
      tipoUsuario,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoUsuario = async (req: Request, res: Response) => {
  const { tipo } = req.body;

  try {
    const existeTipoUsuario = await TipoUsuario.findOne({
      where: { tipo: tipo },
    });
    if (existeTipoUsuario) {
      return res.status(400).json({
        msg: "Ya existe un Tipo de Usuario con el nombre: " + tipo,
      });
    }

    const tipoUsuario = await TipoUsuario.build(req.body);

    // Guardar Tipo de documento
    const tipoUsuarioCreado = await tipoUsuario.save();

    res.json({
      ok: true,
      msg: `El tipo de usuario ${tipo} ha sido creado satisfactoriamente`,
      tipoUsuarioCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { tipo, ...campos } = body;

  try {
    const tipoUsuario = await TipoUsuario.findByPk(id);
    if (!tipoUsuario) {
      return res.status(404).json({
        msg: "No existe un tipo de usuario con el id " + id,
      });
    }

    const getNombre = await tipoUsuario.get().tipo;

    // Actualizaciones
    if (getNombre !== body.tipo) {
      const existeNombre = await TipoUsuario.findOne({
        where: {
          tipo: body.tipo,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: "Ya existe un Tipo de Usuario con el nombre " + tipo,
        });
      }
    }

    campos.tipo = tipo;

    // Se actualiza el campo
    const tipoUsuarioActualizado = await tipoUsuario.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de usuario actualizado",
      tipoUsuarioActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoUsuario = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const tipoUsuario = await TipoUsuario.findByPk(id);
    if (tipoUsuario) {
      const nombre = await tipoUsuario.get().tipo;

      await tipoUsuario.update({ estado: false });

      res.json({
        ok: true,
        msg: "El tipo de usuario " + nombre + " se eliminó ",
        id: req.id,
      });
    }

    if (!tipoUsuario) {
      return res.status(404).json({
        msg: "No existe un tipo de usuario con el id " + id,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
