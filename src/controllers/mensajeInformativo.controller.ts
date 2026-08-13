import { Request, Response } from "express";
import { Op } from "sequelize";
import { CustomRequest } from "../middlewares/validar-jwt";
import MensajeInformativo from "../models/mensajeInformativo.model";

// GET /mensajes-informativos - Listado completo para la vista administrativa
export const getMensajesInformativos = async (req: Request, res: Response) => {
  try {
    const mensajesInformativos = await MensajeInformativo.findAll({
      order: [
        ["prioridad", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json({
      ok: true,
      mensajesInformativos,
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

// GET /mensajes-informativos/activos - Mensajes vigentes para mostrar en el Home
export const getMensajesActivos = async (req: Request, res: Response) => {
  try {
    const ahora = new Date();

    const mensajesActivos = await MensajeInformativo.findAll({
      where: {
        activo: true,
        publicar_desde: { [Op.lte]: ahora },
        publicar_hasta: { [Op.gte]: ahora },
      },
      order: [
        ["prioridad", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json({
      ok: true,
      mensajesActivos,
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

// GET /mensajes-informativos/:id
export const getMensajeInformativo = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const mensajeInformativo = await MensajeInformativo.findByPk(id);

    if (!mensajeInformativo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un mensaje informativo con el id ${id}`,
      });
    }

    res.json({
      ok: true,
      mensajeInformativo,
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

// POST /mensajes-informativos
export const crearMensajeInformativo = async (
  req: CustomRequest,
  res: Response,
) => {
  try {
    const body = { ...req.body, creado_por: req.id };

    const mensajeInformativo = MensajeInformativo.build(body);
    await mensajeInformativo.save();

    res.json({
      ok: true,
      msg: "Mensaje informativo creado satisfactoriamente",
      mensajeInformativo,
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

// PATCH /mensajes-informativos/:id
export const actualizarMensajeInformativo = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const mensajeInformativo = await MensajeInformativo.findByPk(id);

    if (!mensajeInformativo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un mensaje informativo con el id ${id}`,
      });
    }

    const body = { ...req.body, actualizado_por: req.id };
    await mensajeInformativo.update(body);

    res.json({
      ok: true,
      msg: "Mensaje informativo actualizado exitosamente",
      mensajeInformativo,
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

// DELETE /mensajes-informativos/:id - Eliminación física
export const eliminarMensajeInformativo = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const mensajeInformativo = await MensajeInformativo.findByPk(id);

    if (!mensajeInformativo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un mensaje informativo con el id ${id}`,
      });
    }

    await mensajeInformativo.destroy();

    res.json({
      ok: true,
      msg: "Mensaje informativo eliminado exitosamente",
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
