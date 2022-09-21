import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import TipoDireccion from "../models/tipoDireccion.model";

export const getTipoDirecciones = async (req: Request, res: Response) => {
  try {
    const tipoDirecciones = await TipoDireccion.findAll({
      order: db.col("tipoDireccion"),
    });

    res.json({
      ok: true,
      tipoDirecciones,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnTipoDireccion = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const tipoDireccion = await TipoDireccion.findByPk(id);

    res.json({
      ok: true,
      tipoDireccion,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearTipoDireccion = async (req: Request, res: Response) => {
  const { tipoDireccion } = req.body;

  try {
    const existeTipoDireccion = await TipoDireccion.findOne({
      where: { tipoDireccion },
    });
    if (existeTipoDireccion) {
      return res.status(400).json({
        msg: "Ya existe un Tipo de dirección con el nombre: " + tipoDireccion,
      });
    }

    const tipoDocumentoNuevo = await TipoDireccion.build(req.body);

    // Guardar Tipo de dirección
    const tipoDireccionCreado = await tipoDocumentoNuevo.save();

    res.json({
      ok: true,
      msg: `El tipo de dirección ${tipoDireccion} se ha creado satisfactoriamente`,
      tipoDireccionCreado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarTipoDireccion = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { body } = req;
  const { tipoDireccion, ...campos } = body;

  try {
    const tipoDireccion = await TipoDireccion.findByPk(id);
    if (!tipoDireccion) {
      return res.status(404).json({
        msg: `No existe un tipo de dirección con el id ${id}`,
      });
    }

    const getNombre = await tipoDireccion.get().tipoDireccion;

    // Actualizaciones
    if (getNombre !== body.tipoDireccion) {
      const existeNombre = await TipoDireccion.findOne({
        where: {
          tipoDireccion: body.tipoDireccion,
        },
      });
      if (existeNombre) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un Tipo de dirección con el nombre ${tipoDireccion}`,
        });
      }
    }

    // Se actualiza el tipo de Dirección
    const tipoDireccionActualizado = await tipoDireccion.update(body, {
      new: true,
    });

    res.json({
      ok: true,
      msg: "Tipo de dirección actualizado",
      tipoDireccionActualizado,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarTipoDireccion = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const tipoDireccion = await TipoDireccion.findByPk(id);
    if (tipoDireccion) {
      const nombre = await tipoDireccion.get().tipoDireccion;

      await tipoDireccion.update({ estado: false });

      res.json({
        ok: true,
        msg: `El tipo de direccion ${nombre} se eliminó`,
        id,
      });
    }

    if (!tipoDireccion) {
      return res.status(404).json({
        msg: `No existe un tipo de dirección con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarTipoDireccion = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const tipoDireccion = await TipoDireccion.findByPk(id);
    if (!!tipoDireccion) {
      const nombre = await tipoDireccion.get().tipoDireccion;

      if (tipoDireccion.get().estado === false) {
        await tipoDireccion.update({ estado: true });
        res.json({
          ok: true,
          msg: `El tipo de dirección ${nombre} se activó`,
          tipoDireccion,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El tipo de dirección ${nombre} esta activo`,
          tipoDireccion,
        });
      }
    }

    if (!tipoDireccion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un tipo de dirección con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
