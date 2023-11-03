import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import FuenteIngreso from "../models/fuenteIngreso.model";

export const getFuenteIngresos = async (req: Request, res: Response) => {
  try {
    const fuenteDeIngreso = await FuenteIngreso.findAll({
      order: db.col("fuenteIngreso"),
    });

    res.json({
      ok: true,
      fuenteDeIngreso,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnFuenteIngreso = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const fueneteDeIngreso = await FuenteIngreso.findByPk(id);

    res.json({
      ok: true,
      fueneteDeIngreso,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearFuenteIngreso = async (req: Request, res: Response) => {
  const { fuenteIngreso } = req.body;

  try {
    const existeFuenteDeIngreso = await FuenteIngreso.findOne({
      where: { fuenteIngreso },
    });
    if (existeFuenteDeIngreso) {
      return res.status(400).json({
        msg: `Ya existe una fuente de ingreso con el nombre ${fuenteIngreso}`,
      });
    }

    const fuenteDeIngresoNuevo = await FuenteIngreso.build(req.body);

    // Guardar Tipo de fuente de ingreso
    const fuenteDeIngresoCreado = await fuenteDeIngresoNuevo.save();

    res.json({
      ok: true,
      msg: `La fuente de ingreso ${fuenteIngreso} se ha creado satisfactoriamente`,
      fuenteDeIngresoCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarFuenteIngreso = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { fuenteIngreso, ...campos } = body;

  try {
    const fuenteDeIngreso = await FuenteIngreso.findByPk(id);
    if (!fuenteDeIngreso) {
      return res.status(404).json({
        msg: `No existe una fuente de ingreso con el id ${id}`,
      });
    }

    const getNombre = await fuenteDeIngreso.get().fuenteIngreso;

    // Actualizaciones
    if (getNombre !== body.fuenteIngreso) {
      const existeNombre = await FuenteIngreso.findOne({
        where: {
          fuenteIngreso,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe la fuente de ingreso ${fuenteDeIngreso}`,
        });
      }
    }

    // Se actualiza la fuente de ingreso
    const fuenteDeIngresoActualizado = await fuenteDeIngreso.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Fuente de Ingreso actualizado",
      fuenteDeIngresoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarFuenteIngreso = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const fuenteDeIngreso = await FuenteIngreso.findByPk(id);
    if (fuenteDeIngreso) {
      const nombre = await fuenteDeIngreso.get().fuenteIngreso;

      await fuenteDeIngreso.update({ estado: false });

      res.json({
        ok: true,
        msg: `La fuente de ingreso ${nombre} se eliminó`,
        id,
      });
    }

    if (!fuenteDeIngreso) {
      return res.status(404).json({
        msg: `No existe una fuente de ingreso con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarfuenteIngreso = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const fuenteDeIngreso = await FuenteIngreso.findByPk(id);
    if (!!fuenteDeIngreso) {
      const nombre = await fuenteDeIngreso.get().fuenteIngreso;

      if (fuenteDeIngreso.get().estado === false) {
        await fuenteDeIngreso.update({ estado: true });
        res.json({
          ok: true,
          msg: `La fuente de ingreso ${nombre} se activó`,
          fuenteDeIngreso,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La fuente de ingreso ${nombre} está activa`,
          fuenteDeIngreso,
        });
      }
    }

    if (!fuenteDeIngreso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una fuente de ingreso con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
