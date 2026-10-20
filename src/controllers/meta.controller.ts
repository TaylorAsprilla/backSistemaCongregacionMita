import { Request, Response } from "express";
import Meta from "../models/meta.model";
import Informe from "../models/informe.model";
import TipoStatus from "../models/tipoStatus,model";
import { Model, Op } from "sequelize";
import { obtenerInformeAutorizado } from "../helpers/informe-autorizado";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";
import { obtenerPeriodoInformeActivo } from "../helpers/periodoInforme";

type AuthenticatedRequest = Request & { id?: number };

const esInformeAbiertoActual = (informe: Model): boolean =>
  informe.getDataValue("estado") === ESTADO_INFORME_ENUM.ABIERTO &&
  informe.getDataValue("periodo") === obtenerPeriodoInformeActivo();

export const getMetas = async (req: Request, res: Response) => {
  try {
    const metas = await Meta.findAll({
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
    });

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
    const informe = await obtenerInformeAutorizado(req, informeId);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeId}`,
      });
    }

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
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
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
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
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

export const getMetasPendientesPorInforme = async (
  req: Request,
  res: Response,
) => {
  const { informeId } = req.params;

  try {
    const informe = await obtenerInformeAutorizado(req, informeId);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${informeId}`,
      });
    }

    if (!esInformeAbiertoActual(informe)) {
      return res.status(409).json({
        ok: false,
        msg: "Solo se pueden consultar metas pendientes para el informe abierto del periodo activo.",
      });
    }

    const tipoCongregacion = informe.getDataValue("tipo_congregacion");
    const congregacionId = Number(informe.getDataValue("congregacion_id"));
    const periodo = informe.getDataValue("periodo");
    if (
      !["PAIS", "CONGREGACION", "CAMPO"].includes(tipoCongregacion) ||
      !Number.isInteger(congregacionId) ||
      congregacionId <= 0 ||
      typeof periodo !== "string"
    ) {
      return res.status(400).json({
        ok: false,
        msg: "El informe debe pertenecer a una Congregación y tener periodo para consultar metas pendientes.",
      });
    }

    const estadosPendientes = await TipoStatus.findAll({
      where: {
        status: { [Op.in]: ["Pendiente", "En Progreso"] },
        estado: true,
      },
    });
    const statusIds = estadosPendientes.map((status) =>
      Number(status.getDataValue("id")),
    );
    if (statusIds.length === 0) {
      return res.json({
        ok: true,
        metas: [],
        msg: "No hay estados pendientes configurados",
      });
    }

    const informesAnteriores = await Informe.findAll({
      attributes: ["id"],
      where: {
        tipo_congregacion: tipoCongregacion,
        congregacion_id: congregacionId,
        periodo: { [Op.lt]: periodo },
      },
    });
    const informeIds = informesAnteriores.map((registro) =>
      Number(registro.getDataValue("id")),
    );
    if (informeIds.length === 0) {
      return res.json({
        ok: true,
        metas: [],
        msg: "No hay metas pendientes de informes anteriores para esta Congregación.",
      });
    }

    const metas = await Meta.findAll({
      where: {
        informe_id: { [Op.in]: informeIds },
        tipoStatus_id: { [Op.in]: statusIds },
        estado: true,
      },
      include: [
        {
          model: Informe,
          as: "informe",
          attributes: ["id", "periodo", "estado", "tipo_congregacion", "congregacion_id"],
        },
        {
          model: TipoStatus,
          as: "tipoStatus",
          attributes: ["id", "status"],
        },
      ],
      order: [
        ["fecha", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.json({
      ok: true,
      metas,
      msg: "Metas pendientes de informes anteriores de la Congregación",
    });
  } catch (error) {
    console.error("Error obteniendo metas pendientes por informe:", error);
    return res.status(500).json({
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
    if (metaOriginal.getDataValue("estado") !== true) {
      return res.status(409).json({
        ok: false,
        msg: "La meta original ya no está activa para continuar.",
      });
    }

    // El usuario debe tener acceso al informe de destino y este debe estar abierto.
    const nuevoInforme = await obtenerInformeAutorizado(
      req,
      String(nuevo_informe_id),
    );
    if (!nuevoInforme) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un informe con el id ${nuevo_informe_id}`,
      });
    }
    if (!esInformeAbiertoActual(nuevoInforme)) {
      return res.status(409).json({
        ok: false,
        msg: "La continuación debe registrarse en el informe abierto del periodo activo.",
      });
    }

    const informeOriginal = await Informe.findByPk(
      metaOriginal.getDataValue("informe_id"),
    );
    if (
      !informeOriginal ||
      informeOriginal.getDataValue("tipo_congregacion") !==
        nuevoInforme.getDataValue("tipo_congregacion") ||
      Number(informeOriginal.getDataValue("congregacion_id")) !==
        Number(nuevoInforme.getDataValue("congregacion_id")) ||
      typeof informeOriginal.getDataValue("periodo") !== "string" ||
      typeof nuevoInforme.getDataValue("periodo") !== "string" ||
      informeOriginal.getDataValue("periodo") >=
        nuevoInforme.getDataValue("periodo")
    ) {
      return res.status(400).json({
        ok: false,
        msg: "La meta original debe pertenecer a un informe anterior de la misma Congregación.",
      });
    }

    const estadosPendientes = await TipoStatus.findAll({
      where: {
        status: { [Op.in]: ["Pendiente", "En Progreso"] },
        estado: true,
      },
    });
    const statusIds = estadosPendientes.map((status) =>
      Number(status.getDataValue("id")),
    );
    if (!statusIds.includes(Number(metaOriginal.getDataValue("tipoStatus_id")))) {
      return res.status(409).json({
        ok: false,
        msg: "Solo se pueden continuar metas que siguen pendientes o en progreso.",
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

    const informe = await obtenerInformeAutorizado(
      req,
      String(meta.getDataValue("informe_id")),
    );
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: "No tiene acceso al informe de esta meta.",
      });
    }
    if (!esInformeAbiertoActual(informe)) {
      return res.status(409).json({
        ok: false,
        msg: "Las metas solo se pueden completar en el informe abierto del periodo activo.",
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
