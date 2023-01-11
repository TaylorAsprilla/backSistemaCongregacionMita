import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import LinkEvento from "../models/linkEvento.model";

export const getLinkEventos = async (req: Request, res: Response) => {
  try {
    const linkEvento = await LinkEvento.findAll({
      order: [["fecha", "DESC"]],
    });

    res.json({
      ok: true,
      linkEvento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnLinkEvento = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const linkEvento = await LinkEvento.findByPk(id);

    res.json({
      ok: true,
      linkEvento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const crearLinkEvento = async (req: Request, res: Response) => {
  const { body } = req;

  try {
    // =======================================================================
    //                          Guardar Actividad
    // =======================================================================

    const linkEvento = LinkEvento.build(body);
    await linkEvento.save();

    res.json({
      ok: true,
      msg: "Se ha guardado el evento exitosamente ",
      linkEvento,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarLinkEvento = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const linkEvento = await LinkEvento.findByPk(id);
    if (!linkEvento) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un link del evento con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar LinkEvento
    // =======================================================================

    const eventoactualizado = await linkEvento.update(body, { new: true });
    res.json({
      ok: true,
      msg: "Evento Actualizado",
      eventoactualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarLinkEvento = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const linkEvento = await LinkEvento.findByPk(id);
    if (linkEvento) {
      const nombre = await linkEvento.get().titulo;

      await linkEvento.update({ estado: false });

      res.json({
        ok: true,
        msg: "El evento " + nombre + " se eliminó ",
        id,
      });
    }

    if (!linkEvento) {
      return res.status(404).json({
        msg: "No existe un evento con el id " + id,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const activarLinkEvento = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const linkEvento = await LinkEvento.findByPk(id);
    if (!!linkEvento) {
      const nombreEvento = await linkEvento.get().titulo;

      if (linkEvento.get().estado === false) {
        await linkEvento.update({ estado: true });
        res.json({
          ok: true,
          msg: `El evento ${nombreEvento} se activó`,
          linkEvento,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El evento ${nombreEvento} esta activo`,
          linkEvento,
        });
      }
    }

    if (!linkEvento) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un evento con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
