import { Request, Response } from "express";
import db from "../database/connection";
import Actividad from "../models/actividad.model";
import AsuntoPendiente from "../models/asuntoPendiente.model";
import Contabilidad from "../models/contabilidad.model";
import Informe from "../models/informe.model";
import Logro from "../models/logro.model";
import Meta from "../models/meta.model";
import SituacionVisita from "../models/situacionVisita.model";
import Visita from "../models/visita.model";

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

      const aspectoContable = await Contabilidad.findAll({
        where: {
          informe_id: id,
        },
      });

      const logros = await Logro.findAll({
        where: {
          informe_id: id,
        },
      });

      const asuntoPendiente = await AsuntoPendiente.findAll({
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
          asuntoPendiente,
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
