import { Request, Response } from "express";
import ActividadEspiritual from "../models/actividadEspiritual.model";
import CategoriaActividadEspiritual from "../models/categoriaActividadEspiritual.model";
import Informe from "../models/informe.model";

export const getActividadEspiritualPorInforme = async (
  req: Request,
  res: Response,
) => {
  const { informeId } = req.params;

  try {
    const actividades = await ActividadEspiritual.findAll({
      where: { informe_id: informeId, estado: true },
      include: [
        {
          model: CategoriaActividadEspiritual,
          as: "categoria",
          attributes: ["id", "nombre", "descripcion"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      ok: true,
      actividades,
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

export const crearActividadEspiritual = async (req: Request, res: Response) => {
  const { informe_id, categoria_id, observaciones, responsable } = req.body;

  try {
    // Verificar que existe el informe
    const informe = await Informe.findByPk(informe_id);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un informe con el id ${informe_id}`,
      });
    }

    // Verificar que existe la categoría
    const categoria = await CategoriaActividadEspiritual.findByPk(categoria_id);
    if (!categoria) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una categoría con el id ${categoria_id}`,
      });
    }

    const actividad = ActividadEspiritual.build(req.body);
    await actividad.save();

    res.json({
      ok: true,
      msg: "Actividad espiritual creada satisfactoriamente",
      actividad,
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

export const actualizarActividadEspiritual = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;
  const { categoria_id, ...campos } = req.body;

  try {
    const actividad = await ActividadEspiritual.findByPk(id);

    if (!actividad) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una actividad con el id ${id}`,
      });
    }

    // Verificar que existe la categoría si se está actualizando
    if (categoria_id) {
      const categoria =
        await CategoriaActividadEspiritual.findByPk(categoria_id);
      if (!categoria) {
        return res.status(404).json({
          ok: false,
          msg: `No existe una categoría con el id ${categoria_id}`,
        });
      }
      campos.categoria_id = categoria_id;
    }

    await actividad.update(campos);

    res.json({
      ok: true,
      msg: "Actividad actualizada exitosamente",
      actividad,
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

export const eliminarActividadEspiritual = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const actividad = await ActividadEspiritual.findByPk(id);

    if (!actividad) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una actividad con el id ${id}`,
      });
    }

    await actividad.update({ estado: false });

    res.json({
      ok: true,
      msg: "Actividad eliminada exitosamente",
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
