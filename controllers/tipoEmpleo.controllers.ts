import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoEmpleo from "../models/tipoEmpleo.model";

export const getTipoEmpleo = async (req: Request, res: Response) => {
  try {
    const tipoEmpleo = await TipoEmpleo.findAll({
      order: db.col("nombreEmpleo"),
    });

    res.json({
      ok: true,
      tipoEmpleo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnTipoEmpleo = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tipoEmpleo = await TipoEmpleo.findByPk(id);

    res.json({
      ok: true,
      tipoEmpleo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoEmpleo = async (req: Request, res: Response) => {
  const { nombreEmpleo } = req.body;

  try {
    const existeTipoEmpleo = await TipoEmpleo.findOne({
      where: { nombreEmpleo },
    });
    if (existeTipoEmpleo) {
      return res.status(400).json({
        msg: `Ya existe el tipo de empleo ${nombreEmpleo}`,
      });
    }

    const tipoEmpleoNuevo = await TipoEmpleo.build(req.body);

    // Guardar Grado académico
    const tipoEmpleoCreado = await tipoEmpleoNuevo.save();

    res.json({
      ok: true,
      msg: `El tipo de emplo ${nombreEmpleo} se ha creado satisfactoriamente`,
      tipoEmpleoCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoEmpleo = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { nombreEmpleo, ...campos } = body;

  try {
    const tipoEmpleo = await TipoEmpleo.findByPk(id);
    if (!tipoEmpleo) {
      return res.status(404).json({
        msg: `No existe un tipo de empleo con el id ${id}`,
      });
    }

    const getNombre = await tipoEmpleo.get().nombreEmpleo;

    // Actualizaciones
    if (getNombre !== body.nombreEmpleo) {
      const existeNombre = await TipoEmpleo.findOne({
        where: {
          nombreEmpleo: body.nombreEmpleo,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe el tipo de emplro ${getNombre}`,
        });
      }
    }

    // Se actualiza el Grado Académico
    const tipoEmpleoActualizado = await tipoEmpleo.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de empleo actualizado",
      tipoEmpleoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoEmpleo = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const tipoEmpleo = await TipoEmpleo.findByPk(id);
    if (tipoEmpleo) {
      const nombre = await tipoEmpleo.get().nombreEmpleo;

      await tipoEmpleo.update({ estado: false });

      res.json({
        ok: true,
        msg: `El tipo de empleo ${nombre} se eliminó`,
        id,
      });
    }

    if (!tipoEmpleo) {
      return res.status(404).json({
        msg: `No existe el tipo de empleo con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarTipoEmpleo = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const tipoEmpleo = await TipoEmpleo.findByPk(id);
    if (!!tipoEmpleo) {
      const nombre = await tipoEmpleo.get().nombreEmpleo;

      if (tipoEmpleo.get().estado === false) {
        await tipoEmpleo.update({ estado: true });
        res.json({
          ok: true,
          msg: `El tipo de empleo ${nombre} se activó`,
          tipoEmpleo,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El tipo de empleo ${nombre} está activo`,
          tipoEmpleo,
        });
      }
    }

    if (!tipoEmpleo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un tipo de empleo con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
