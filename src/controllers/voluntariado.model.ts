import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Voluntariado from "../models/voluntariado.model";

export const getVoluntariados = async (req: Request, res: Response) => {
  try {
    const voluntariado = await Voluntariado.findAll({
      order: db.col("nombreVoluntariado"),
    });

    res.json({
      ok: true,
      voluntariados: voluntariado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnVoluntariado = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const voluntariado = await Voluntariado.findByPk(id);

    res.json({
      ok: true,
      voluntariado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearVoluntariado = async (req: Request, res: Response) => {
  const { nombreVoluntariado } = req.body;

  try {
    const existeVoluntariado = await Voluntariado.findOne({
      where: { nombreVoluntariado },
    });
    if (existeVoluntariado) {
      return res.status(400).json({
        msg: `Ya existe el voluntariado ${nombreVoluntariado}`,
      });
    }

    const voluntariadoNuevo = await Voluntariado.build(req.body);

    // Guardar El Voluntariado
    const voluntariadoCreado = await voluntariadoNuevo.save();

    res.json({
      ok: true,
      msg: `EL volunatariado ${nombreVoluntariado} se ha creado satisfactoriamente`,
      voluntariadoCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarVoluntariado = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { nombreVoluntariado, ...campos } = body;

  try {
    const voluntariado = await Voluntariado.findByPk(id);
    if (!voluntariado) {
      return res.status(404).json({
        msg: `No existe un voluntariado con el id ${id}`,
      });
    }

    const getNombre = await voluntariado.get().nombreVoluntariado;

    // Actualizaciones
    if (getNombre !== body.nombreVoluntariado) {
      const existeNombre = await Voluntariado.findOne({
        where: {
          nombreVoluntariado: body.nombreVoluntariado,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe el voluntariado ${nombreVoluntariado}`,
        });
      }
    }

    // Se actualiza el voluntariado
    const voluntariadoActualizado = await voluntariado.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Voluntariado actualizado",
      voluntariadoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarVoluntariado = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const voluntariado = await Voluntariado.findByPk(id);
    if (voluntariado) {
      const nombre = await voluntariado.get().nombreVoluntariado;

      await voluntariado.update({ estado: false });

      res.json({
        ok: true,
        msg: `El voluntariado ${nombre} se eliminó`,
        id,
      });
    }

    if (!voluntariado) {
      return res.status(404).json({
        msg: `No existe el voluntariado con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarVoluntariado = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const voluntariado = await Voluntariado.findByPk(id);
    if (!!voluntariado) {
      const nombre = await voluntariado.get().nombreVoluntariado;

      if (voluntariado.get().estado === false) {
        await voluntariado.update({ estado: true });
        res.json({
          ok: true,
          msg: `El voluntariado ${nombre} se activó`,
          voluntariado,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El tipo de empleo ${nombre} está activo`,
          tipoEmpleo: voluntariado,
        });
      }
    }

    if (!voluntariado) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el voluntariado con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
