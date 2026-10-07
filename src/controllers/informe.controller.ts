import { Request, Response } from "express";
import { Model, Op } from "sequelize";
import Actividad from "../models/actividad.model";
import ActividadEconomica from "../models/actividadEconomica.model";
import ActividadEspiritual from "../models/actividadEspiritual.model";
import AsuntoPendiente from "../models/asuntoPendiente.model";
import Campo from "../models/campo.model";
import Congregacion from "../models/congregacion.model";
import Diezmos from "../models/diezmos.model";
import Informe from "../models/informe.model";
import Logro from "../models/logro.model";
import Meta from "../models/meta.model";
import Pais from "../models/pais.model";
import SituacionVisita from "../models/situacionVisita.model";
import Usuario from "../models/usuario.model";
import Visita from "../models/visita.model";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";
import { obtenerPeriodoInformeActivo } from "../helpers/periodoInforme";
import {
  obtenerContextoObreroPais,
  obtenerObrerosAsignadosAlPais,
  obtenerObrerosResponsablesPais,
} from "../services/supervisionPais.authorization";
import { paisPerteneceAlAlcance } from "../services/supervisionPais.scope";

type AuthenticatedRequest = Request & { id?: number };

const esFechaISO = (fecha: unknown): fecha is string =>
  typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha);

export const getResumenInforme = async (req: Request, res: Response) => {
  const { usuarioId, informeId, fechaInicio, fechaFin } = req.query;
  const usuarioAutenticado = (req as AuthenticatedRequest).id;

  if (
    typeof usuarioId !== "string" ||
    !/^\d+$/.test(usuarioId) ||
    (informeId !== undefined &&
      (typeof informeId !== "string" || !/^\d+$/.test(informeId))) ||
    !esFechaISO(fechaInicio) ||
    !esFechaISO(fechaFin)
  ) {
    return res.status(400).json({
      ok: false,
      msg: "Se requiere usuarioId numérico, fechaInicio y fechaFin en formato YYYY-MM-DD; informeId es opcional",
    });
  }

  if (Number(usuarioId) !== usuarioAutenticado) {
    return res.status(403).json({
      ok: false,
      msg: "No tiene permiso para consultar este informe",
    });
  }

  if (fechaInicio > fechaFin) {
    return res.status(400).json({
      ok: false,
      msg: "fechaInicio no puede ser posterior a fechaFin",
    });
  }

  try {
    const whereInforme: any = {
      usuario_id: Number(usuarioId),
      estado: ESTADO_INFORME_ENUM.ABIERTO,
      [Op.or]: [
        { periodo: fechaInicio },
        {
          periodo: null,
          createdAt: {
            [Op.between]: [`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59.999`],
          },
        },
      ],
    };

    if (typeof informeId === "string") {
      whereInforme.id = Number(informeId);
    }

    const informe = await Informe.findOne({
      attributes: ["id", "usuario_id", "estado", "periodo", "createdAt", "updatedAt"],
      where: whereInforme,
      order: [["createdAt", "DESC"]],
    });

    if (!informe) {
      return res.json({
        ok: true,
        tieneInformeAbierto: false,
        informe: null,
        secciones: null,
      });
    }

    const idInformeEncontrado = informe.getDataValue("id");
    const [
      actividades,
      metas,
      visitas,
      situacionVisitas,
      logros,
      aspectoEspiritual,
      actividadesEconomicas,
      asuntosPendientes,
      diezmos,
    ] = await Promise.all([
      Actividad.count({ where: { informe_id: idInformeEncontrado } }),
      Meta.count({
        where: { informe_id: idInformeEncontrado, estado: true },
      }),
      Visita.count({
        where: { informe_id: idInformeEncontrado, estado: true },
      }),
      SituacionVisita.count({ where: { informe_id: idInformeEncontrado } }),
      Logro.count({
        where: { informe_id: idInformeEncontrado, estado: true },
      }),
      ActividadEspiritual.count({
        where: { informe_id: idInformeEncontrado, estado: true },
      }),
      ActividadEconomica.count({ where: { informe_id: idInformeEncontrado } }),
      AsuntoPendiente.count({
        where: { informe_id: idInformeEncontrado, estado: true },
      }),
      Diezmos.count({ where: { informe_id: idInformeEncontrado } }),
    ]);

    return res.json({
      ok: true,
      tieneInformeAbierto: true,
      informe,
      secciones: {
        actividades: actividades > 0,
        metas: metas > 0,
        visitas: visitas > 0,
        situacionVisitas: situacionVisitas > 0,
        logros: logros > 0,
        aspectoEspiritual: aspectoEspiritual > 0,
        actividadesEconomicas: actividadesEconomicas > 0,
        asuntosPendientes: asuntosPendientes > 0,
        aspectoContable: diezmos > 0,
      },
      msg: "Informe abierto encontrado",
    });
  } catch (error) {
    console.error("Error obteniendo resumen del informe:", error);
    return res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getInformes = async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as AuthenticatedRequest).id;
    const contexto = usuarioId ? await obtenerContextoObreroPais(usuarioId) : null;
    const usuarioIds =
      contexto !== null ? await obtenerObrerosAsignadosAlPais(contexto.paises) : undefined;
    if (usuarioIds?.length === 0) {
      return res.json({ ok: true, informes: [], msg: "No hay informes en el país asignado." });
    }
    const informes = await Informe.findAll({
      ...(usuarioIds !== undefined
        ? { where: { usuario_id: { [Op.in]: usuarioIds } } }
        : {}),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      ok: true,
      informes,
      msg: "Informes registrados",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getInforme = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const informe = await Informe.findByPk(id);

    if (!!informe) {
      const usuarioId = (req as AuthenticatedRequest).id;
      const contexto = usuarioId ? await obtenerContextoObreroPais(usuarioId) : null;
      if (contexto) {
        const usuarioIds = await obtenerObrerosAsignadosAlPais(contexto.paises);
        if (!usuarioIds.includes(Number(informe.getDataValue("usuario_id")))) {
          return res.status(404).json({
            ok: false,
            msg: "No existe el informe con el id solicitado.",
          });
        }
      }

      const actividades = await Actividad.findAll({
        where: {
          informe_id: id,
        },
        order: [
          ["fecha", "DESC"],
          ["id", "DESC"],
        ],
      });

      const visitas = await Visita.findAll({
        where: {
          informe_id: id,
          estado: true,
        },
        order: [
          ["mes", "DESC"],
          ["id", "DESC"],
        ],
      });

      const situacionVisita = await SituacionVisita.findAll({
        where: {
          informe_id: id,
        },
        order: [
          ["fecha", "DESC"],
          ["id", "DESC"],
        ],
      });

      const aspectoContable = await Diezmos.findAll({
        where: {
          informe_id: id,
        },
        order: [
          ["mes", "DESC"],
          ["id", "DESC"],
        ],
      });

      const logros = await Logro.findAll({
        where: {
          informe_id: id,
          estado: true,
        },
        order: [
          ["fecha", "DESC"],
          ["id", "DESC"],
        ],
      });

      const metas = await Meta.findAll({
        where: {
          informe_id: id,
          estado: true,
        },
        order: [
          ["fecha", "DESC"],
          ["id", "DESC"],
        ],
      });

      const actividadesEspirituales = await ActividadEspiritual.findAll({
        where: {
          informe_id: id,
          estado: true,
        },
        order: [
          ["fecha", "DESC"],
          ["id", "DESC"],
        ],
      });

      const actividadesEconomicas = await ActividadEconomica.findAll({
        where: {
          informe_id: id,
        },
        order: [
          ["fecha", "DESC"],
          ["id", "DESC"],
        ],
      });

      const asuntosPendientes = await AsuntoPendiente.findAll({
        where: {
          informe_id: id,
          estado: true,
        },
      });

      res.json({
        ok: true,
        msg: `Informe identificado con el ID: ${id}`,
        informe: {
          informacioninforme: informe,
          actividades,
          actividadesEspirituales,
          actividadesEconomicas,
          asuntosPendientes,
          visitas,
          situacionVisita,
          aspectoContable,
          logros,
          metas,
        },
      });
    } else {
      res.status(404).json({
        ok: false,
        msg: `No existe el informe con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearInforme = async (req: Request, res: Response) => {
  const { body } = req;
  const periodo = body.periodo || obtenerPeriodoInformeActivo();
  const usuarioAutenticado = (req as AuthenticatedRequest).id;

  try {
    const contexto = usuarioAutenticado
      ? await obtenerContextoObreroPais(usuarioAutenticado)
      : null;
    if (contexto && Number(body.usuario_id) !== usuarioAutenticado) {
      return res.status(403).json({
        ok: false,
        msg: "El Obrero País solo puede crear sus propios informes.",
      });
    }
  } catch (error) {
    console.error("Error validando permisos para crear informe:", error);
    return res.status(500).json({ ok: false, msg: "No fue posible validar los permisos." });
  }

  if (!esFechaISO(periodo) || periodo !== obtenerPeriodoInformeActivo()) {
    return res.status(400).json({
      ok: false,
      msg: "El periodo del informe debe ser el trimestre abierto actualmente",
    });
  }

  // =======================================================================
  //                          Guardar Informe
  // =======================================================================
  try {
    const informeAbierto = await Informe.findOne({
      where: {
        usuario_id: body.usuario_id,
        estado: ESTADO_INFORME_ENUM.ABIERTO,
      },
    });

    if (informeAbierto) {
      return res.status(409).json({
        ok: false,
        msg: "El obrero ya tiene un informe abierto",
        informe: informeAbierto,
      });
    }

    const informe = Informe.build({ ...body, periodo });
    await informe.save();

    res.json({ ok: true, msg: "Informe creado ", informe });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarInforme = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  // =======================================================================
  //                          Actualizar Informe
  // =======================================================================
  try {
    const informe = await Informe.findByPk(id);
    if (!informe) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un informe con el id ${id}`,
      });
    }

    const usuarioId = (req as AuthenticatedRequest).id;
    const contexto = usuarioId ? await obtenerContextoObreroPais(usuarioId) : null;
    if (contexto && Number(informe.getDataValue("usuario_id")) !== usuarioId) {
      return res.status(403).json({
        ok: false,
        msg: "Los informes de otras congregaciones son de solo lectura.",
      });
    }

    const informeActualizado = await informe.update(body, { new: true });

    res.json({
      ok: true,
      msg: "Informe Actualizado",
      informeActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarInforme = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const informe = await Informe.findByPk(id);
    if (informe) {
      const usuarioId = (req as AuthenticatedRequest).id;
      const contexto = usuarioId ? await obtenerContextoObreroPais(usuarioId) : null;
      if (contexto && Number(informe.getDataValue("usuario_id")) !== usuarioId) {
        return res.status(403).json({
          ok: false,
          msg: "Los informes de otras congregaciones son de solo lectura.",
        });
      }

      await informe.update({ estado: false });

      res.json({
        ok: true,
        msg: `Se elminó el informe ${id}`,
        id,
        informe,
      });
    }

    if (!informe) {
      return res.status(404).json({
        msg: `No existe un informe con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};

export const verificarInformeAbierto = async (req: Request, res: Response) => {
  const { usuario_id, fechaInicio, fechaFin } = req.query;

  try {
    if (!usuario_id || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        msg: "Se requiere usuario_id, fechaInicio y fechaFin",
      });
    }

    const usuarioAutenticado = (req as AuthenticatedRequest).id;
    const contexto = usuarioAutenticado
      ? await obtenerContextoObreroPais(usuarioAutenticado)
      : null;
    if (contexto && Number(usuario_id) !== usuarioAutenticado) {
      return res.status(403).json({
        ok: false,
        msg: "No tiene permiso para consultar informes de otros obreros.",
      });
    }

    const informeAbierto = await Informe.findOne({
      where: {
        usuario_id,
        estado: ESTADO_INFORME_ENUM.ABIERTO,
        [Op.or]: [
          { periodo: fechaInicio },
          {
            periodo: null,
            createdAt: {
              [Op.between]: [fechaInicio, fechaFin],
            },
          },
        ],
      },
    });

    res.json({
      ok: true,
      tieneInformeAbierto: !!informeAbierto,
      informe: informeAbierto || null,
      msg: informeAbierto
        ? "El usuario tiene un informe abierto en el rango de fechas especificado"
        : "El usuario no tiene informes abiertos en el rango de fechas especificado",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getInformesPorTrimestreYPais = async (
  req: Request,
  res: Response,
) => {
  const { trimestre, año, pais_id, todos_periodos } = req.query;

  try {
    // Validar parámetros requeridos
    if (!trimestre || !año || !pais_id) {
      return res.status(400).json({
        ok: false,
        msg: "Se requiere trimestre (1-4), año y pais_id",
      });
    }

    if (
      typeof trimestre !== "string" ||
      !/^[1-4]$/.test(trimestre) ||
      typeof año !== "string" ||
      !/^\d{4}$/.test(año) ||
      typeof pais_id !== "string" ||
      !/^\d+$/.test(pais_id) ||
      (todos_periodos !== undefined && todos_periodos !== "true")
    ) {
      return res.status(400).json({
        ok: false,
        msg: "El año, trimestre y país deben tener un formato válido.",
      });
    }
    const trimestreNum = Number(trimestre);
    const añoNum = Number(año);
    const paisId = Number(pais_id);

    const usuarioId = (req as AuthenticatedRequest).id;
    const contexto = usuarioId ? await obtenerContextoObreroPais(usuarioId) : null;
    if (contexto && !paisPerteneceAlAlcance(paisId, contexto.paises)) {
      return res.status(403).json({
        ok: false,
        msg: "No tiene permiso para consultar informes de ese país.",
      });
    }

    if (contexto && contexto.paises.length === 0) {
      return res.status(403).json({
        ok: false,
        msg: "No tiene un país activo asignado para supervisar.",
      });
    }

    // Validar trimestre
    if (trimestreNum < 1 || trimestreNum > 4) {
      return res.status(400).json({
        ok: false,
        msg: "El trimestre debe ser un número entre 1 y 4",
      });
    }

    // Calcular fechas de inicio y fin del trimestre
    const fechaInicio = new Date(añoNum, (trimestreNum - 1) * 3, 1);
    const fechaFin = new Date(añoNum, trimestreNum * 3, 0, 23, 59, 59, 999);

    // Verificar que el país existe
    const pais = await Pais.findByPk(paisId);
    if (!pais) {
      return res.status(404).json({
        ok: false,
        msg: `No existe el país con el id ${paisId}`,
      });
    }

    // Obtener todas las congregaciones del país
    const congregaciones = await Congregacion.findAll({
      where: {
        pais_id: paisId,
        estado: true,
      },
    });

    const congregacionIds = congregaciones.map((c: any) => c.id);

    // Obtener todos los campos de las congregaciones del país
    const campos = await Campo.findAll({
      where: {
        congregacion_id: {
          [Op.in]: congregacionIds,
        },
        estado: true,
      },
    });

    // Recopilar todos los IDs de obreros encargados
    const obrerosIds = new Set<number>(
      contexto ? await obtenerObrerosAsignadosAlPais([paisId]) : [],
    );

    // Agregar obreros de congregaciones
    congregaciones.forEach((congregacion: any) => {
      if (congregacion.idObreroEncargado) {
        obrerosIds.add(congregacion.idObreroEncargado);
      }
      if (congregacion.idObreroEncargadoDos) {
        obrerosIds.add(congregacion.idObreroEncargadoDos);
      }
    });

    // Agregar obreros de campos
    campos.forEach((campo: any) => {
      if (campo.idObreroEncargado) {
        obrerosIds.add(campo.idObreroEncargado);
      }
      if (campo.idObreroEncargadoDos) {
        obrerosIds.add(campo.idObreroEncargadoDos);
      }
    });

    const obrerosArray = Array.from(obrerosIds);

    if (obrerosArray.length === 0) {
      return res.json({
        ok: true,
        informes: [],
        pendientes: [],
        msg: "No hay obreros encargados en las congregaciones y campos del país especificado",
        estadisticas: {
          trimestre: trimestreNum,
          año: añoNum,
          pais: (pais as any).pais,
          fechaInicio,
          fechaFin,
          totalCongregaciones: congregaciones.length,
          totalCampos: campos.length,
          totalObreros: 0,
          totalInformes: 0,
          unidadesConInforme: 0,
          unidadesPendientes: 0,
          unidadesSinObrero: congregaciones.length + campos.length,
          porcentajeEntregado: null,
        },
      });
    }

    const periodo = `${añoNum}-${String((trimestreNum - 1) * 3 + 1).padStart(2, "0")}-01`;

    // Buscar informes del periodo solicitado, incluyendo los registros anteriores a la columna periodo.
    const informes = await Informe.findAll({
      where: {
        usuario_id: {
          [Op.in]: obrerosArray,
        },
        estado: { [Op.ne]: ESTADO_INFORME_ENUM.ELIMINADO },
        ...(!todos_periodos ? { [Op.or]: [
          { periodo },
          {
            periodo: null,
            createdAt: {
              [Op.between]: [fechaInicio, fechaFin],
            },
          },
        ] } : {}),
      },
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
            "email",
            "numeroCelular",
          ],
        },
        {
          model: Actividad,
          as: "actividades",
          separate: true,
        },
        {
          model: ActividadEconomica,
          as: "actividadesEconomicas",
          separate: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const informeIds = informes.map((informe) => Number(informe.get("id")));
    const whereRelaciones = { informe_id: { [Op.in]: informeIds } };
    // Consultas por lote, secuenciales para no multiplicar conexiones por informe.
    const visitas = informeIds.length ? await Visita.findAll({
      where: whereRelaciones, order: [["mes", "DESC"], ["id", "DESC"]],
    }) : [];
    const situaciones = informeIds.length ? await SituacionVisita.findAll({
      where: whereRelaciones, order: [["fecha", "DESC"], ["id", "DESC"]],
    }) : [];
    const contabilidad = informeIds.length ? await Diezmos.findAll({
      where: whereRelaciones, order: [["mes", "DESC"], ["id", "DESC"]],
    }) : [];
    const logros = informeIds.length ? await Logro.findAll({
      where: whereRelaciones, order: [["fecha", "DESC"], ["id", "DESC"]],
    }) : [];
    const metas = informeIds.length ? await Meta.findAll({
      where: whereRelaciones, order: [["fecha", "DESC"], ["id", "DESC"]],
    }) : [];
    const agruparPorInforme = (registros: Model[]): Map<number, Model[]> => {
      const grupos = new Map<number, Model[]>();
      for (const registro of registros) {
        const id = Number(registro.get("informe_id"));
        const grupo = grupos.get(id) ?? [];
        grupo.push(registro);
        grupos.set(id, grupo);
      }
      return grupos;
    };
    const visitasPorInforme = agruparPorInforme(visitas);
    const situacionesPorInforme = agruparPorInforme(situaciones);
    const contabilidadPorInforme = agruparPorInforme(contabilidad);
    const logrosPorInforme = agruparPorInforme(logros);
    const metasPorInforme = agruparPorInforme(metas);
    const informesConRelaciones = informes.map((informe: any) => {
        return {
          ...informe.toJSON(),
          usuario: informe.usuario ? {
            ...informe.usuario.toJSON(),
            congregacion: (() => {
              const unidad = congregaciones.find((c: any) =>
                [c.idObreroEncargado, c.idObreroEncargadoDos].includes(informe.usuario_id));
              return unidad ? { id: unidad.get("id"), nombre: unidad.get("congregacion") } : undefined;
            })(),
            campo: (() => {
              const unidad = campos.find((c: any) =>
                [c.idObreroEncargado, c.idObreroEncargadoDos].includes(informe.usuario_id));
              return unidad ? { id: unidad.get("id"), nombre: unidad.get("campo"), congregacion_id: unidad.get("congregacion_id") } : undefined;
            })(),
          } : null,
          visitas: visitasPorInforme.get(Number(informe.id)) ?? [],
          situacionVisita: situacionesPorInforme.get(Number(informe.id)) ?? [],
          aspectoContable: contabilidadPorInforme.get(Number(informe.id)) ?? [],
          logros: logrosPorInforme.get(Number(informe.id)) ?? [],
          metas: metasPorInforme.get(Number(informe.id)) ?? [],
        };
    });

    const informesDelPeriodo = informesConRelaciones.filter((informe) =>
      informe.periodo
        ? String(informe.periodo).slice(0, 10) === periodo
        : new Date(informe.createdAt) >= fechaInicio && new Date(informe.createdAt) <= fechaFin,
    );
    const usuariosConInforme = new Set(
      informesDelPeriodo.map((informe) => Number(informe.usuario_id)),
    );
    const responsables = await Usuario.findAll({
      where: { id: { [Op.in]: obrerosArray } },
      attributes: ["id", "primerNombre", "segundoNombre", "primerApellido", "segundoApellido", "numeroCelular"],
    });
    const responsablesPorId = new Map(responsables.map((usuario) => [Number(usuario.get("id")), usuario.toJSON()]));
    const unidades = [
      ...congregaciones.map((congregacion: any) => ({
        id: Number(congregacion.id),
        nombre: String(congregacion.congregacion),
        tipo: "CONGREGACION" as const,
        congregacion_id: Number(congregacion.id),
        campo_id: null,
        obreros: [
          Number(congregacion.idObreroEncargado),
          Number(congregacion.idObreroEncargadoDos),
        ].filter((id) => id > 0),
      })),
      ...campos.map((campo: any) => ({
        id: Number(campo.id),
        nombre: String(campo.campo),
        tipo: "CAMPO" as const,
        congregacion_id: Number(campo.congregacion_id),
        campo_id: Number(campo.id),
        obreros: [
          Number(campo.idObreroEncargado),
          Number(campo.idObreroEncargadoDos),
        ].filter((id) => id > 0),
      })),
    ];
    const pendientes = unidades
      .filter(
        (unidad) =>
          unidad.obreros.length > 0 &&
          !unidad.obreros.some((obreroId) => usuariosConInforme.has(obreroId)),
      )
      .map(({ obreros, ...unidad }) => ({
        ...unidad,
        responsables: obreros.map((id) => responsablesPorId.get(id)).filter(Boolean),
      }));
    const unidadesConInforme = unidades.filter(
      (unidad) =>
        unidad.obreros.length > 0 &&
        unidad.obreros.some((obreroId) => usuariosConInforme.has(obreroId)),
    ).length;
    const unidadesSinObrero = unidades.filter((unidad) => unidad.obreros.length === 0).length;
    const unidadesConResponsable = unidades.length - unidadesSinObrero;

    res.json({
      ok: true,
      informes: informesConRelaciones,
      pendientes,
      msg: `Informes del trimestre ${trimestreNum} del año ${añoNum} para el país ${(pais as any).pais}`,
      estadisticas: {
        trimestre: trimestreNum,
        año: añoNum,
        pais: (pais as any).pais,
        fechaInicio,
        fechaFin,
        totalCongregaciones: congregaciones.length,
        totalCampos: campos.length,
        totalObreros: obrerosArray.length,
        totalInformes: informesDelPeriodo.length,
        unidadesConInforme,
        unidadesPendientes: pendientes.length,
        unidadesSinObrero,
        porcentajeEntregado:
          unidadesConResponsable > 0
            ? Math.round((unidadesConInforme / unidadesConResponsable) * 1000) / 10
            : null,
      },
    });
  } catch (error) {
    console.error("Error en getInformesPorTrimestreYPais:", error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
