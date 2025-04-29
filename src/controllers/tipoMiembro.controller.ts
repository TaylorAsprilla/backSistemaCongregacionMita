import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoMiembro from "../models/tipoMiembro.model";

export const getTipoMiembro = async (req: Request, res: Response) => {
  try {
    const tipoMiembro = await TipoMiembro.findAll({
      order: db.col("miembro"),
    });

    res.json({
      ok: true,
      tipoMiembro,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnTipoMiembro = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tipoMiembro = await TipoMiembro.findByPk(id);

    res.json({
      ok: true,
      tipoMiembro,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoMiembro = async (req: Request, res: Response) => {
  const { miembro } = req.body;

  try {
    const existeTipoMiembro = await TipoMiembro.findOne({
      where: { miembro },
    });
    if (existeTipoMiembro) {
      return res.status(400).json({
        msg: `Ya existe el tipo de miembro ${miembro}`,
      });
    }

    const tipoMiembroNuevo = await TipoMiembro.build(req.body);

    // Guardar Tipo de Miembro
    const tipoMiembroCreado = await tipoMiembroNuevo.save();

    res.json({
      ok: true,
      msg: `El tipo de miembro ${miembro} se ha creado satisfactoriamente`,
      tipoMiembroCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoMiembro = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { miembro, ...campos } = body;

  try {
    const tipoMiembro = await TipoMiembro.findByPk(id);
    if (!tipoMiembro) {
      return res.status(404).json({
        msg: `No existe un tipo de miembro con el id ${id}`,
      });
    }

    const getNombre = await tipoMiembro.get().miembro;

    // Actualizaciones
    if (getNombre !== body.miembro) {
      const existeNombre = await TipoMiembro.findOne({
        where: {
          miembro: body.miembro,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe el tipo de miembro ${getNombre}`,
        });
      }
    }

    // Se actualiza el tipo de Miembro
    const tipoMiembroActualizado = await tipoMiembro.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de miembro fue actualizado",
      tipoMiembroActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoMiembro = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const tipoMiembro = await TipoMiembro.findByPk(id);
    if (tipoMiembro) {
      const nombre = await tipoMiembro.get().miembro;

      await tipoMiembro.update({ estado: false });

      res.json({
        ok: true,
        msg: `El tipo de miembro ${nombre} se eliminó`,
        id,
      });
    }

    if (!tipoMiembro) {
      return res.status(404).json({
        msg: `No existe el tipo de miembro con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarTipoMiembro = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const tipoMiembro = await TipoMiembro.findByPk(id);
    if (!!tipoMiembro) {
      const nombre = await tipoMiembro.get().miembro;

      if (tipoMiembro.get().estado === false) {
        await tipoMiembro.update({ estado: true });
        res.json({
          ok: true,
          msg: `El tipo de miembro ${nombre} se activó`,
          tipoMiembro,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El tipo de miembro ${nombre} está activo`,
          tipoMiembro,
        });
      }
    }

    if (!tipoMiembro) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un tipo de miembro con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
