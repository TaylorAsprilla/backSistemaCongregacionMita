import { Request, Response } from "express";
import db from "../database/connection";
import CategoriaActividadEspiritual from "../models/categoriaActividadEspiritual.model";

export const getCategoriaActividadEspiritual = async (
  req: Request,
  res: Response,
) => {
  try {
    const categorias = await CategoriaActividadEspiritual.findAll({
      where: { estado: true },
      order: [["nombre", "ASC"]],
    });

    res.json({
      ok: true,
      categorias,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearCategoriaActividadEspiritual = async (
  req: Request,
  res: Response,
) => {
  const { nombre } = req.body;

  try {
    const existeCategoria = await CategoriaActividadEspiritual.findOne({
      where: { nombre },
    });

    if (existeCategoria) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe una categoría con el nombre: ${nombre}`,
      });
    }

    const categoria = CategoriaActividadEspiritual.build(req.body);
    await categoria.save();

    res.json({
      ok: true,
      msg: `La categoría ${nombre} fue creada satisfactoriamente`,
      categoria,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarCategoriaActividadEspiritual = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;
  const { nombre, ...campos } = req.body;

  try {
    const categoria = await CategoriaActividadEspiritual.findByPk(id);

    if (!categoria) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una categoría con el id ${id}`,
      });
    }

    const nombreActual = categoria.get().nombre;

    if (nombreActual !== nombre) {
      const existeNombre = await CategoriaActividadEspiritual.findOne({
        where: { nombre },
      });

      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe una categoría con el nombre ${nombre}`,
        });
      }
    }

    campos.nombre = nombre;
    await categoria.update(campos);

    res.json({
      ok: true,
      msg: "Categoría actualizada exitosamente",
      categoria,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarCategoriaActividadEspiritual = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const categoria = await CategoriaActividadEspiritual.findByPk(id);

    if (!categoria) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una categoría con el id ${id}`,
      });
    }

    await categoria.update({ estado: false });

    res.json({
      ok: true,
      msg: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
