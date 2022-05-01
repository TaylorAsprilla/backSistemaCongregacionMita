import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Permiso from "../models/permiso.model";

export const getPermiso = async (req: Request, res: Response) => {
  try {
    const permiso = await Permiso.findAll({
      order: db.col("permiso"),
    });

    res.json({
      ok: true,
      permiso,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnPermiso = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const permiso = await Permiso.findByPk(id);

    res.json({
      ok: true,
      permiso,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearPermiso = async (req: Request, res: Response) => {
  const { permiso } = req.body;

  try {
    const existePermiso = await Permiso.findOne({
      where: { permiso: permiso },
    });
    if (existePermiso) {
      return res.status(400).json({
        msg: "Ya existe un permiso con el nombre: " + permiso,
      });
    }

    const permisoNuevo = await Permiso.build(req.body);

    // Guardar Tipo de documento
    const permisoCreado = await permisoNuevo.save();

    res.json({
      ok: true,
      msg: `El permiso ${permisoNuevo} ha sido creado satisfactoriamente`,
      permisoCreado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarPermiso = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { permiso, ...campos } = body;

  try {
    const permiso = await Permiso.findByPk(id);
    if (!permiso) {
      return res.status(404).json({
        msg: "No existe un permiso con el id " + id,
      });
    }

    const getNombre = await permiso.get().permiso;

    // Actualizaciones
    if (getNombre !== body.permiso) {
      const existeNombre = await Permiso.findOne({
        where: {
          permiso: body.permiso,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: "Ya existe un permiso con el nombre " + permiso,
        });
      }
    }

    campos.permiso = permiso;

    // Se actualiza el campo
    const permisoActualizado = await permiso.update(campos, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Permiso actualizado",
      permisoActualizado,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarPermiso = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const permiso = await Permiso.findByPk(id);
    if (permiso) {
      const nombre = await permiso.get().permiso;

      await permiso.update({ estado: false });

      res.json({
        ok: true,
        msg: "El permiso " + nombre + " se eliminó ",
        id: req.id,
      });
    }

    if (!permiso) {
      return res.status(404).json({
        msg: "No existe un permiso con el id " + id,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};
