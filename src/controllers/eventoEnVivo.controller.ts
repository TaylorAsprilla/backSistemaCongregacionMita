import { Request, Response } from "express";
import { CustomRequest } from "../middlewares/validar-jwt";
import EventoEnVivo from "../models/eventoEnVivo.model";
import { auditoriaEventoEnVivo } from "../database/eventoEnVivo.associations";
import { AUDITORIA_EVENTO_EN_VIVO_ENUM } from "../enum/auditoriaEventoEnVivo.enum";
import db from "../database/connection";
import Usuario from "../models/usuario.model";

export const getEventosEnVivo = async (req: Request, res: Response) => {
  try {
    const eventosEnVivo = await EventoEnVivo.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
          ],
        },
      ],
    });

    res.json({
      ok: true,
      eventosEnVivo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getEventosActivos = async (req: Request, res: Response) => {
  try {
    const eventosActivos = await EventoEnVivo.findAll({
      where: {
        estado: true,
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
          ],
        },
      ],
    });

    res.json({
      ok: true,
      eventosActivos,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUltimoEventoEnVivo = async (req: Request, res: Response) => {
  try {
    const ultimoEvento = await EventoEnVivo.findOne({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
          ],
        },
      ],
    });

    if (!ultimoEvento) {
      return res.status(404).json({
        ok: false,
        msg: "No hay eventos configurados",
      });
    }

    res.json({
      ok: true,
      ultimoEvento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnEventoEnVivo = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const eventoEnVivo = await EventoEnVivo.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
          ],
        },
      ],
    });

    if (!eventoEnVivo) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un evento en vivo con el id ${id}`,
      });
    }

    res.json({
      ok: true,
      eventoEnVivo,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearEventoEnVivo = async (req: CustomRequest, res: Response) => {
  const { body } = req;
  const usuario_id = req.id; // ID del usuario autenticado
  const transaction = await db.transaction();

  try {
    // Agregar el usuario_id al body
    body.usuario_id = usuario_id;

    const eventoEnVivo = EventoEnVivo.build(body);
    await eventoEnVivo.save({ transaction });

    // Registrar auditoría
    await auditoriaEventoEnVivo(
      eventoEnVivo.get().id,
      Number(usuario_id),
      AUDITORIA_EVENTO_EN_VIVO_ENUM.CREACION,
      transaction,
    );

    await transaction.commit();

    res.json({
      ok: true,
      msg: "Se ha creado el evento en vivo exitosamente",
      eventoEnVivo,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarEventoEnVivo = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;
  const { body } = req;
  const usuario_id = req.id; // ID del usuario autenticado
  const transaction = await db.transaction();

  try {
    const eventoEnVivo = await EventoEnVivo.findByPk(id, { transaction });

    if (!eventoEnVivo) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe un evento en vivo con el id ${id}`,
      });
    }

    // No permitir cambiar el usuario_id
    delete body.usuario_id;

    const eventoActualizado = await eventoEnVivo.update(body, { transaction });

    // Registrar auditoría
    await auditoriaEventoEnVivo(
      Number(id),
      Number(usuario_id),
      AUDITORIA_EVENTO_EN_VIVO_ENUM.ACTUALIZACION,
      transaction,
    );

    await transaction.commit();

    res.json({
      ok: true,
      msg: "Evento en vivo actualizado exitosamente",
      eventoEnVivo: eventoActualizado,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarEventoEnVivo = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;
  const usuario_id = req.id; // ID del usuario autenticado
  const transaction = await db.transaction();

  try {
    const eventoEnVivo = await EventoEnVivo.findByPk(id, { transaction });

    if (!eventoEnVivo) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe un evento en vivo con el id ${id}`,
      });
    }

    const titulo = eventoEnVivo.get().titulo;
    await eventoEnVivo.update({ estado: false }, { transaction });

    // Registrar auditoría
    await auditoriaEventoEnVivo(
      Number(id),
      Number(usuario_id),
      AUDITORIA_EVENTO_EN_VIVO_ENUM.ELIMINACION,
      transaction,
    );

    await transaction.commit();

    res.json({
      ok: true,
      msg: `El evento "${titulo}" se eliminó exitosamente`,
      id,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarEventoEnVivo = async (
  req: CustomRequest,
  res: Response,
) => {
  const { id } = req.params;
  const usuario_id = req.id; // ID del usuario autenticado
  const transaction = await db.transaction();

  try {
    const eventoEnVivo = await EventoEnVivo.findByPk(id, { transaction });

    if (!eventoEnVivo) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe un evento en vivo con el id ${id}`,
      });
    }

    const titulo = eventoEnVivo.get().titulo;

    if (eventoEnVivo.get().estado === false) {
      await eventoEnVivo.update({ estado: true }, { transaction });

      // Registrar auditoría
      await auditoriaEventoEnVivo(
        Number(id),
        Number(usuario_id),
        AUDITORIA_EVENTO_EN_VIVO_ENUM.ACTIVACION,
        transaction,
      );

      await transaction.commit();

      res.json({
        ok: true,
        msg: `El evento "${titulo}" se activó exitosamente`,
        eventoEnVivo,
      });
    } else {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        msg: `El evento "${titulo}" ya está activo`,
        eventoEnVivo,
      });
    }
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
