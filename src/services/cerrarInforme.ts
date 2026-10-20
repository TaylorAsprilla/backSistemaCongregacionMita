import db from "../database/connection";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";
import Informe from "../models/informe.model";
import { registrarAuditoriaInforme } from "../helpers/informeAuditoria";
import {
  guardarSnapshotResponsables,
  obtenerUnidadYResponsablesActuales,
  TipoCongregacionInforme,
} from "./informeResponsables";

export const cerrarInformeTransaccional = async (
  informeId: number,
  usuarioCierreId: number | null,
) =>
  db.transaction(async (transaction) => {
    const informe = await Informe.findByPk(informeId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!informe) return null;
    if (informe.getDataValue("estado") !== ESTADO_INFORME_ENUM.ABIERTO) {
      return informe;
    }

    const tipoCongregacion = informe.getDataValue("tipo_congregacion") as
      | TipoCongregacionInforme
      | null;
    const congregacionId = Number(informe.getDataValue("congregacion_id"));
    const congregacion =
      tipoCongregacion &&
      ["PAIS", "CONGREGACION", "CAMPO"].includes(tipoCongregacion) &&
      Number.isInteger(congregacionId) &&
      congregacionId > 0
        ? await obtenerUnidadYResponsablesActuales(
            tipoCongregacion,
            congregacionId,
            transaction,
          )
        : null;

    if (congregacion) {
      await guardarSnapshotResponsables(
        informeId,
        congregacion.responsables,
        transaction,
      );
    }
    await informe.update(
      {
        estado: ESTADO_INFORME_ENUM.CERRADO,
        fecha_cierre: new Date(),
        usuario_cierre_id: usuarioCierreId,
        ...(congregacion
          ? {
              nombre_unidad: congregacion.nombre_unidad,
              nombre_pais: congregacion.nombre_pais,
              nombre_congregacion: congregacion.nombre_congregacion,
              nombre_campo: congregacion.nombre_campo,
            }
          : {}),
      },
      { transaction },
    );
    await registrarAuditoriaInforme({
      informe_id: informeId,
      seccion: "informe",
      registro_id: informeId,
      accion: "CERRAR",
      usuario_id: usuarioCierreId,
      cambios: { estado: ESTADO_INFORME_ENUM.CERRADO },
      transaction,
    });
    return informe;
  });
