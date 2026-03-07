import { Request, Response } from "express";
import db from "../database/connection";
import CategoriaProfesion from "../models/categoriaProfesion.model";

export const getCategoriasProfesion = async (req: Request, res: Response) => {
  try {
    const categorias = await CategoriaProfesion.findAll({
      where: { estado: true },
      order: db.col("nombre"),
    });

    res.json({
      ok: true,
      categorias,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getCategoriaProfesion = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const categoria = await CategoriaProfesion.findByPk(id);

    if (!categoria) {
      return res.status(404).json({
        ok: false,
        msg: "No existe una categoría de profesión con el id " + id,
      });
    }

    res.json({
      ok: true,
      categoria,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearCategoriaProfesion = async (req: Request, res: Response) => {
  const { nombre } = req.body;

  try {
    const existeCategoria = await CategoriaProfesion.findOne({
      where: { nombre: nombre },
    });

    if (existeCategoria) {
      return res.status(400).json({
        ok: false,
        msg: "Ya existe una categoría de profesión con el nombre: " + nombre,
      });
    }

    const nuevaCategoria = await CategoriaProfesion.build(req.body);
    const categoriaCreada = await nuevaCategoria.save();

    res.json({
      ok: true,
      msg: `La categoría de profesión ${nombre} se creó satisfactoriamente`,
      categoria: categoriaCreada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarCategoriaProfesion = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const categoria = await CategoriaProfesion.findByPk(id);

    if (!categoria) {
      return res.status(404).json({
        ok: false,
        msg: "No existe una categoría de profesión con el id " + id,
      });
    }

    const nombreActual = categoria.get().nombre;

    // Verificar si el nombre cambió y si ya existe
    if (nombreActual !== body.nombre) {
      const existeNombre = await CategoriaProfesion.findOne({
        where: { nombre: body.nombre },
      });

      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg:
            "Ya existe una categoría de profesión con el nombre " + body.nombre,
        });
      }
    }

    const categoriaActualizada = await categoria.update(body, { new: true });

    res.json({
      ok: true,
      msg: "Categoría de profesión actualizada",
      categoria: categoriaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarCategoriaProfesion = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const categoria = await CategoriaProfesion.findByPk(id);

    if (!categoria) {
      return res.status(404).json({
        ok: false,
        msg: "No existe una categoría de profesión con el id " + id,
      });
    }

    await categoria.update({ estado: false });

    res.json({
      ok: true,
      msg: `La categoría de profesión fue eliminada`,
      categoria,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarCategoriaProfesion = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const categoria = await CategoriaProfesion.findByPk(id);

    if (!categoria) {
      return res.status(404).json({
        ok: false,
        msg: "No existe una categoría de profesión con el id " + id,
      });
    }

    await categoria.update({ estado: true });

    res.json({
      ok: true,
      msg: `La categoría de profesión fue activada`,
      categoria,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};
