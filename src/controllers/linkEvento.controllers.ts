import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import LinkEvento from "../models/linkEvento.model";
import { TIPOEVENTO_ID } from "../enum/evento.enum";

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

export const getUltimoEvento = async (req: Request, res: Response) => {
  try {
    const tipoEventoId = TIPOEVENTO_ID.SERVICIO;

    const ultimoLink = await LinkEvento.findOne({
      where: {
        tipoEvento_id: tipoEventoId,
      },
      order: [["fecha", "DESC"]],
      limit: 1,
    });

    if (!ultimoLink) {
      return res.status(404).json({
        ok: false,
        msg: `No se encontraron enlaces para el tipo de evento con id ${tipoEventoId}`,
      });
    }

    res.json({
      ok: true,
      linkEvento: ultimoLink,
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

export const agregarALaBiblioteca = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const linkEvento = await LinkEvento.findByPk(id);
    if (!!linkEvento) {
      const nombreEvento = await linkEvento.get().titulo;

      if (linkEvento.get().eventoEnBiblioteca === false) {
        await linkEvento.update({ eventoEnBiblioteca: true });
        res.json({
          ok: true,
          msg: `El evento ${nombreEvento} se agregó a la biblioteca`,
          linkEvento,
          id: id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El evento ${nombreEvento} está en la biblioteca`,
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

export const eliminarDeLaBiblioteca = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const linkEvento = await LinkEvento.findByPk(id);
    if (!!linkEvento) {
      const nombreEvento = await linkEvento.get().titulo;

      if (linkEvento.get().eventoEnBiblioteca === true) {
        await linkEvento.update({ eventoEnBiblioteca: false });
        res.json({
          ok: true,
          msg: `El evento ${nombreEvento} se eliminó a la biblioteca`,
          linkEvento,
          id: id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El evento ${nombreEvento} no se encuentra en la biblioteca`,
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
