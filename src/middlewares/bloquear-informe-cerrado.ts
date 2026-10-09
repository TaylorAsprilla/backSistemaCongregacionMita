import { NextFunction, Request, Response } from "express";
import { Model, ModelStatic } from "sequelize";
import Informe from "../models/informe.model";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";

const responderSiInformeCerrado = async (
  informeId: string | number,
  res: Response,
  next: NextFunction,
) => {
  const informe = await Informe.findByPk(informeId);
  if (informe && informe.getDataValue("estado") !== ESTADO_INFORME_ENUM.ABIERTO) {
    res.status(409).json({
      ok: false,
      msg: "Los informes cerrados son de solo lectura.",
    });
    return;
  }
  next();
};

export const bloquearInformeCerradoEnCreacion =
  (campoIdInforme = "informe_id") =>
  async (req: Request, res: Response, next: NextFunction) => {
    const informeId = req.body[campoIdInforme];
    if (informeId === undefined || informeId === null || informeId === "") {
      return next();
    }
    try {
      return await responderSiInformeCerrado(informeId, res, next);
    } catch (error) {
      return next(error);
    }
  };

export const bloquearInformeCerradoEnEdicion =
  <T extends Model>(modelo: ModelStatic<T>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registro = await modelo.findByPk(req.params.id);
      if (!registro) return next();

      const informeIdActual = registro.getDataValue("informe_id");
      if (
        typeof informeIdActual === "string" ||
        typeof informeIdActual === "number"
      ) {
        await responderSiInformeCerrado(
          informeIdActual,
          res,
          () => undefined,
        );
        if (res.headersSent) return;
      }

      const informeIdNuevo = req.body.informe_id;
      if (
        informeIdNuevo !== undefined &&
        String(informeIdNuevo) !== String(informeIdActual)
      ) {
        return await responderSiInformeCerrado(informeIdNuevo, res, next);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
