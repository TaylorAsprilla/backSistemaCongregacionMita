import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Permiso from "../models/permiso.model";

export const getPermisos = async (req: Request, res: Response) => {
  try {
    const permiso = await Permiso.findAll({
      order: db.col("permiso"),
    });

    res.json({
      ok: true,
      permiso,
    });
  } catch (error) {
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
      msg: `El permiso ${permiso} ha sido creado satisfactoriamente`,
      permisoCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarPermiso = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const permiso = await Permiso.findByPk(id);
    if (!permiso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un permiso con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar el Permiso
    // =======================================================================

    const permisoActualizado = await permiso.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "El permiso se actualizó satisfactoriamente",
      permisoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
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
        msg: `No existe un permiso con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarPermiso = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const permiso = await Permiso.findByPk(id);
    if (!!permiso) {
      const nombre = await permiso.get().permiso;

      if (permiso.get().estado === false) {
        await permiso.update({ estado: true });
        res.json({
          ok: true,
          msg: `El permiso ${nombre} se activó`,
          permiso,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El permiso ${nombre} esta activo`,
          permiso,
        });
      }
    }

    if (!permiso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un permiso con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const getPermisoUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [permisos, metadata] = await db.query(
      `SELECT up.usuario_id, up.permiso_id, p.permiso, p.estado 
        FROM usuarioPermiso up 
        INNER JOIN permiso p ON up.permiso_id  = p.id  
        WHERE up.usuario_id  = ${id}`
    );

    res.json({
      ok: true,
      permisos,
      id: id,
    });
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
