import { Request, Response } from "express";
import Meta from "../models/meta.model";
import Informe from "../models/informe.model";
import TipoStatus from "../models/tipoStatus,model";
import { Op } from "sequelize";

export const getMetas = async (req: Request, res: Response) => {
  try {
    const metas = await Meta.findAll();

    res.json({
      ok: true,
      metas,
      msg: "Metas registradas",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getMeta = async (req: Request, res: Response) => {
  const { id } = req.params;

  const meta = await Meta.findByPk(id);

  if (meta) {
    res.json({
      ok: true,
      meta,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe la meta con el id ${id}`,
    });
  }
};

export const crearMeta = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Meta
    // =======================================================================

    const meta = Meta.build(body);
    await meta.save();

    res.json({
      ok: true,
      msg: "Se ha guardado la meta exitosamente ",
      actividad: meta,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarMeta = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const meta = await Meta.findByPk(id);
    if (!meta) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una meta con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar Meta
    // =======================================================================

    const metaActualizada = await meta.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Meta Actualizada",
      metaActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarMeta = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const meta = await Meta.findByPk(id);
    if (!meta) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una meta con el id ${id}`,
      });
    }

    // Eliminación lógica - cambiar estado a false
    await meta.update({ estado: false });

    res.json({
      ok: true,
      msg: "Meta eliminada",
      id,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

// ========================================================================
//                   NUEVOS ENDPOINTS PARA SEGUIMIENTO DE METAS
// ========================================================================

export const getMetasPorInforme = async (req: Request, res: Response) => {
  const { informeId } = req.params;

  try {
    const metas = await Meta.findAll({
      where: {
        informe_id: informeId,
        estado: true,
      },
      include: [
        {
          model: TipoStatus,
          as: "tipoStatus",
          attributes: ["id", "status"],
        },
        {
          model: Meta,
          as: "metaOriginal",
          attributes: ["id", "meta", "fecha"],
          required: false,
        },
      ],
      order: [["fecha", "ASC"]],
    });

    res.json({
      ok: true,
      metas,
      msg: "Metas del informe",
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

export const getMetasPendientesPorUsuario = async (
  req: Request,
  res: Response,
) => {
  const { usuarioId } = req.params;

  try {
    // Obtener estados pendientes/en progreso
    const estadosPendientes = await TipoStatus.findAll({
      where: {
        status: {
          [Op.in]: ["Pendiente", "En Progreso"],
        },
        estado: true,
      },
    });

    const statusIds = estadosPendientes.map((s) => s.getDataValue("id"));

    if (statusIds.length === 0) {
      return res.json({
        ok: true,
        metas: [],
        msg: "No hay estados pendientes configurados",
      });
    }

    // Obtener metas pendientes del usuario
    const metas = await Meta.findAll({
      where: {
        tipoStatus_id: {
          [Op.in]: statusIds,
        },
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
        {
          model: TipoStatus,
          as: "tipoStatus",
          attributes: ["id", "status"],
        },
      ],
      order: [["fecha", "ASC"]],
    });

    res.json({
      ok: true,
      metas,
      msg: "Metas pendientes del usuario",
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

export const copiarMetaANuevoInforme = async (req: Request, res: Response) => {
  const { meta_id_original, nuevo_informe_id, actualizacion } = req.body;

  try {
    // Verificar que existe la meta original
    const metaOriginal = await Meta.findByPk(meta_id_original);
    if (!metaOriginal) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una meta con el id ${meta_id_original}`,
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

    // Crear nueva meta como continuación
    const nuevaMeta = await Meta.create({
      fecha: new Date(),
      meta: metaOriginal.getDataValue("meta"),
      accion: metaOriginal.getDataValue("accion"),
      comentarios: actualizacion || metaOriginal.getDataValue("comentarios"),
      metaOriginal_id: meta_id_original,
      informe_id: nuevo_informe_id,
      tipoStatus_id: metaOriginal.getDataValue("tipoStatus_id"),
      estado: true,
    });

    res.json({
      ok: true,
      msg: "Meta copiada al nuevo informe exitosamente",
      meta: nuevaMeta,
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

export const marcarMetaComoCumplida = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { comentarios } = req.body;

  try {
    const meta = await Meta.findByPk(id);
    if (!meta) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una meta con el id ${id}`,
      });
    }

    // Buscar el estado "Cumplida"
    const estadoCumplida = await TipoStatus.findOne({
      where: {
        status: "Cumplida",
        estado: true,
      },
    });

    if (!estadoCumplida) {
      return res.status(404).json({
        ok: false,
        msg: 'No existe el estado "Cumplida" en el sistema',
      });
    }

    // Actualizar meta
    await meta.update({
      tipoStatus_id: estadoCumplida.getDataValue("id"),
      fechaCumplimiento: new Date(),
      comentarios: comentarios || meta.getDataValue("comentarios"),
    });

    res.json({
      ok: true,
      msg: "Meta marcada como cumplida exitosamente",
      meta,
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
