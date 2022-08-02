import { Request, Response } from "express";
import { CustomRequest } from "../middlewares/validar-jwt";
import SeccionInforme from "../models/seccionInforme.model";

export const getSeccionesInformes = async (req: Request, res: Response) => {
  const seccionesInforme = await SeccionInforme.findAll();

  res.json({
    ok: true,
    seccionesInforme,
  });
};

export const crearSeccionInforme = async (req: Request, res: Response) => {
  const { body } = req;
  const { seccion } = req.body;

  // =======================================================================
  //                          Validaciones
  // =======================================================================
  try {
    const existeSeccion = await SeccionInforme.findOne({
      where: {
        seccion: seccion,
      },
    });

    if (existeSeccion) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe una sección con el nombre ${seccion}`,
      });
    }
    // =======================================================================
    //                          Guardar Sección
    // =======================================================================

    const nuevaSeccion = SeccionInforme.build(body);
    await nuevaSeccion.save();

    res.json({
      ok: true,
      msg: `Nueva sección del informe creada con el nombre ${seccion}`,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarSeccionInforme = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const seccion = await SeccionInforme.findByPk(id);
    if (!seccion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una sección del informe con el id ${id}`,
      });
    }

    const getSeccion = await seccion.get().seccion;

    // =======================================================================
    //                          Actualizar Sección Informe
    // =======================================================================

    if (getSeccion !== body.seccion) {
      const existeSeccion = await SeccionInforme.findOne({
        where: {
          seccion: body.seccion,
        },
      });
      if (existeSeccion) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un sección con el nombre ${getSeccion}`,
        });
      }
    }

    const seccionActualizada = await seccion.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Sección Actualizada",
      seccionActualizada,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarSeccionInforme = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const seccion = await SeccionInforme.findByPk(id);
    if (seccion) {
      await seccion.update({ estado: false });

      res.json({
        ok: true,
        msg: `Se elminó la sección del informe ${id}`,
        id,
        seccion,
      });
    }

    if (!seccion) {
      return res.status(404).json({
        msg: `No existe una sección del informe con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};

export const activarSeccionInforme = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const seccion = await SeccionInforme.findByPk(id);
    if (!!seccion) {
      const nombreSeccion = await seccion.get().seccion;

      if (seccion.get().estado === false) {
        await seccion.update({ estado: true });
        res.json({
          ok: true,
          msg: `La sección del informe ${nombreSeccion} se activó`,
          seccion,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La sección del informe ${nombreSeccion} esta activa`,
          seccion,
        });
      }
    }

    if (!seccion) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un sección del informe con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
