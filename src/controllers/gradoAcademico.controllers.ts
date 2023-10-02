import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import GradoAcademico from "../models/gradoAcademico.model";

export const getGradoAcademico = async (req: Request, res: Response) => {
  try {
    const gradoAcademico = await GradoAcademico.findAll({
      order: db.col("id"),
    });

    res.json({
      ok: true,
      gradoAcademico,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnGradoAcademico = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const gradoAcademico = await GradoAcademico.findByPk(id);

    res.json({
      ok: true,
      gradoAcademico,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearGradoAcademico = async (req: Request, res: Response) => {
  const { gradoAcademico } = req.body;

  try {
    const existeGradoAcademico = await GradoAcademico.findOne({
      where: { gradoAcademico },
    });
    if (existeGradoAcademico) {
      return res.status(400).json({
        msg: `Ya existe el grado académico con el nombre ${gradoAcademico}`,
      });
    }

    const gradoAcademicoNuevo = await GradoAcademico.build(req.body);

    // Guardar Grado académico
    const gradoAcademicoCreado = await gradoAcademicoNuevo.save();

    res.json({
      ok: true,
      msg: `El grado académico ${gradoAcademico} se ha creado satisfactoriamente`,
      gradoAcademicoCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarGradoAcademico = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { gradoAcademico, ...campos } = body;

  try {
    const gradoAcademico = await GradoAcademico.findByPk(id);
    if (!gradoAcademico) {
      return res.status(404).json({
        msg: `No existe un grado académico con el id ${id}`,
      });
    }

    const getNombre = await gradoAcademico.get().gradoAcademico;

    // Actualizaciones
    if (getNombre !== body.gradoAcademico) {
      const existeNombre = await GradoAcademico.findOne({
        where: {
          gradoAcademico: body.gradoAcademico,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe el grado académico ${gradoAcademico}`,
        });
      }
    }

    // Se actualiza el Grado Académico
    const gradoAcademicoActualizado = await gradoAcademico.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Grado académico actualizado",
      gradoAcademicoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarGradoAcademico = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const gradoAcademico = await GradoAcademico.findByPk(id);
    if (gradoAcademico) {
      const nombre = await gradoAcademico.get().gradoAcademico;

      await gradoAcademico.update({ estado: false });

      res.json({
        ok: true,
        msg: `El grado académico ${nombre} se eliminó`,
        id,
      });
    }

    if (!gradoAcademico) {
      return res.status(404).json({
        msg: `No existe un grado académico con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarGradoAcademico = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const gradoAcademico = await GradoAcademico.findByPk(id);
    if (!!gradoAcademico) {
      const nombre = await gradoAcademico.get().gradoAcademico;

      if (gradoAcademico.get().estado === false) {
        await gradoAcademico.update({ estado: true });
        res.json({
          ok: true,
          msg: `El grado académico ${nombre} se activó`,
          gradoAcademico,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El grado académico ${nombre} está activo`,
          gradoAcademico,
        });
      }
    }

    if (!gradoAcademico) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un grado académico con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
