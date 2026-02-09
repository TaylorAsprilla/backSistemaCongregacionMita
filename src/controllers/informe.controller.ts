import { Request, Response } from "express";
import { Op } from "sequelize";
import db from "../database/connection";
import Actividad from "../models/actividad.model";
import ActividadEconomica from "../models/actividadEconomica.model";
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

export const getInformes = async (req: Request, res: Response) => {
  try {
    const informes = await Informe.findAll({
      order: db.col("fecha"),
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
      const actividades = await Actividad.findAll({
        where: {
          informe_id: id,
        },
      });

      const visitas = await Visita.findAll({
        where: {
          informe_id: id,
        },
      });

      const situacionVisita = await SituacionVisita.findAll({
        where: {
          informe_id: id,
        },
      });

      const aspectoContable = await Diezmos.findAll({
        where: {
          informe_id: id,
        },
      });

      const logros = await Logro.findAll({
        where: {
          informe_id: id,
        },
      });

      const metas = await Meta.findAll({
        where: {
          informe_id: id,
        },
      });

      res.json({
        ok: true,
        msg: `Informe identificado con el ID: ${id}`,
        informe: {
          informacioninforme: informe,
          actividades,
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

  // =======================================================================
  //                          Guardar Informe
  // =======================================================================
  try {
    const informe = Informe.build(body);
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

  console.log(usuario_id, fechaInicio, fechaFin);

  try {
    if (!usuario_id || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        msg: "Se requiere usuario_id, fechaInicio y fechaFin",
      });
    }

    const informeAbierto = await Informe.findOne({
      where: {
        usuario_id,
        estado: ESTADO_INFORME_ENUM.ABIERTO,
        createdAt: {
          [Op.between]: [fechaInicio, fechaFin],
        },
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
  const { trimestre, año, pais_id } = req.query;

  try {
    // Validar parámetros requeridos
    if (!trimestre || !año || !pais_id) {
      return res.status(400).json({
        ok: false,
        msg: "Se requiere trimestre (1-4), año y pais_id",
      });
    }

    const trimestreNum = parseInt(trimestre as string);
    const añoNum = parseInt(año as string);
    const paisId = parseInt(pais_id as string);

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
    const obrerosIds = new Set<number>();

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
        msg: "No hay obreros encargados en las congregaciones y campos del país especificado",
        estadisticas: {
          trimestre: trimestreNum,
          año: añoNum,
          pais: (pais as any).pais,
          totalCongregaciones: congregaciones.length,
          totalCampos: campos.length,
          totalObreros: 0,
          totalInformes: 0,
        },
      });
    }

    // Buscar todos los informes de esos obreros en el trimestre especificado
    const informes = await Informe.findAll({
      where: {
        usuario_id: {
          [Op.in]: obrerosArray,
        },
        createdAt: {
          [Op.between]: [fechaInicio, fechaFin],
        },
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
        },
        {
          model: ActividadEconomica,
          as: "actividadesEconomicas",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Obtener relaciones adicionales para cada informe
    const informesConRelaciones = await Promise.all(
      informes.map(async (informe: any) => {
        const [visitas, situacionVisita, aspectoContable, logros, metas] =
          await Promise.all([
            Visita.findAll({
              where: { informe_id: informe.id },
            }),
            SituacionVisita.findAll({
              where: { informe_id: informe.id },
            }),
            Diezmos.findAll({
              where: { informe_id: informe.id },
            }),
            Logro.findAll({
              where: { informe_id: informe.id },
            }),
            Meta.findAll({
              where: { informe_id: informe.id },
            }),
          ]);

        return {
          ...informe.toJSON(),
          visitas,
          situacionVisita,
          aspectoContable,
          logros,
          metas,
        };
      }),
    );

    res.json({
      ok: true,
      informes: informesConRelaciones,
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
        totalInformes: informesConRelaciones.length,
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
