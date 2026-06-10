import { Request, Response } from "express";
import AsuntoPendiente from "../models/asuntoPendiente.model";
import Informe from "../models/informe.model";
import TipoStatus from "../models/tipoStatus,model";

export const getAsuntosPendientes = async (req: Request, res: Response) => {
  try {
    const asuntos = await AsuntoPendiente.findAll({
      where: { estado: true },
      include: [
        {
          model: Informe,
          as: "informe",
          attributes: ["id", "createdAt"],
        },
      ],
    });

    res.json({
      ok: true,
      asuntos,
      msg: "Asuntos pendientes",
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

export const getAsuntoPendiente = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const asunto = await AsuntoPendiente.findByPk(id);

    if (!asunto) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un asunto pendiente con el id ${id}`,
      });
    }

    res.json({
      ok: true,
      asunto,
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

export const getAsuntosPorInforme = async (req: Request, res: Response) => {
  const { informeId } = req.params;

  try {
    const asuntos = await AsuntoPendiente.findAll({
      where: {
        informe_id: informeId,
        estado: true,
      },
    });

    res.json({
      ok: true,
      asuntos,
      msg: "Asuntos del informe",
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

export const getAsuntosPendientesPorUsuario = async (
  req: Request,
  res: Response,
) => {
  const { usuarioId } = req.params;

  try {
    // Obtener estados pendientes/en progreso
    const estadosPendientes = await TipoStatus.findAll({
      where: {
        estado: true,
      },
    });

    const statusIds = estadosPendientes.map((s) => s.getDataValue("id"));

    if (statusIds.length === 0) {
      return res.json({
        ok: true,
        asuntos: [],
        msg: "No hay estados pendientes configurados",
      });
    }

    // Obtener asuntos pendientes del usuario
    const asuntos = await AsuntoPendiente.findAll({
      where: {
        estado: true,
      },
      include: [
        {
          model: Informe,
          as: "informe",
          where: {
            usuario_id: usuarioId,
          },
          attributes: ["id", "createdAt"],
        },
      ],
    });

    res.json({
      ok: true,
      asuntos,
      msg: "Asuntos pendientes del usuario",
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

export const crearAsuntoPendiente = async (req: Request, res: Response) => {
  try {
    const { informe_id } = req.body;

    console.log("Datos recibidos para crear asunto pendiente:", req.body);

    // Verificar que existe el informe
    const informe = await Informe.findByPk(informe_id);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un informe con el id ${informe_id}`,
      });
    }

    const asunto = AsuntoPendiente.build(req.body);
    await asunto.save();

    res.json({
      ok: true,
      msg: "Asunto pendiente creado satisfactoriamente",
      asunto,
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

export const actualizarAsuntoPendiente = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;

  try {
    const asunto = await AsuntoPendiente.findByPk(id);
    if (!asunto) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un asunto pendiente con el id ${id}`,
      });
    }

    await asunto.update(req.body);

    res.json({
      ok: true,
      msg: "Asunto pendiente actualizado",
      asunto,
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

export const copiarAsuntoANuevoInforme = async (
  req: Request,
  res: Response,
) => {
  const { asunto_id_original, nuevo_informe_id, actualizacion } = req.body;

  try {
    // Verificar que existe el asunto original
    const asuntoOriginal = await AsuntoPendiente.findByPk(asunto_id_original);
    if (!asuntoOriginal) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un asunto pendiente con el id ${asunto_id_original}`,
      });
    }

    // Verificar que existe el nuevo informe
    const nuevoInforme = await Informe.findByPk(nuevo_informe_id);
    if (!nuevoInforme) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un informe con el id ${nuevo_informe_id}`,
      });
    }

    // Crear nuevo asunto como continuación
    const nuevoAsunto = await AsuntoPendiente.create({
      asunto: asuntoOriginal.getDataValue("asunto"),
      tipoAsunto: asuntoOriginal.getDataValue("tipoAsunto"),
      responsable: asuntoOriginal.getDataValue("responsable"),
      informe_id: nuevo_informe_id,
      estado: true,
    });

    res.json({
      ok: true,
      msg: "Asunto copiado al nuevo informe exitosamente",
      asunto: nuevoAsunto,
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

export const eliminarAsuntoPendiente = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const asunto = await AsuntoPendiente.findByPk(id);
    if (!asunto) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un asunto pendiente con el id ${id}`,
      });
    }

    await asunto.update({ estado: false });

    res.json({
      ok: true,
      msg: "Asunto pendiente eliminado",
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
