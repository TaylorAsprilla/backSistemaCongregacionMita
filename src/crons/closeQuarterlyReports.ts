import cron from "node-cron";
import Informe from "../models/informe.model";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";
import { obtenerFechaCierreInforme } from "../helpers/periodoInforme";
import { cerrarInformeTransaccional } from "../services/cerrarInforme";

const ZONA_HORARIA_UTC = "UTC";

function obtenerFechaCierre(periodo: string | Date): Date {
  const fechaInforme = periodo instanceof Date ? periodo : new Date(periodo);
  const anio = fechaInforme.getUTCFullYear();
  const trimestre = Math.floor(fechaInforme.getUTCMonth() / 3) + 1;
  return obtenerFechaCierreInforme(trimestre, anio);
}

const closeExpiredQuarterlyReports = async () => {
  try {
    const informesAbiertos = await Informe.findAll({
      where: {
        estado: ESTADO_INFORME_ENUM.ABIERTO,
      },
    });

    const ahora = new Date();
    let informesCerrados = 0;

    for (const informe of informesAbiertos) {
      const periodo = informe.getDataValue("periodo") || informe.getDataValue("createdAt");
      const fechaCierre = obtenerFechaCierre(periodo);

      if (ahora >= fechaCierre) {
        try {
          const cerrado = await cerrarInformeTransaccional(
            Number(informe.getDataValue("id")),
            null,
          );
          if (
            cerrado?.getDataValue("estado") === ESTADO_INFORME_ENUM.CERRADO
          ) {
            informesCerrados += 1;
          }
        } catch (error) {
          console.error(
            `Error cerrando el informe ${informe.getDataValue("id")}:`,
            error,
          );
        }
      }
    }

    console.info(
      `Cierre trimestral ejecutado. Informes cerrados: ${informesCerrados}`,
    );
  } catch (error) {
    console.error("Error cerrando informes trimestrales:", error);
  }
};

export async function runReportClosureStartupCatchup(
  closeExpired = closeExpiredQuarterlyReports,
) {
  await closeExpired();
}

const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production") {
  cron.schedule("5 5 * * *", closeExpiredQuarterlyReports, {
    timezone: ZONA_HORARIA_UTC,
  });
  console.info(
    "Cron de cierre de informes configurado para ejecutarse diariamente a las 05:05 UTC.",
  );
} else {
  console.info(`Cron de cierre de informes desactivado en entorno: ${nodeEnv}`);
}

export default closeExpiredQuarterlyReports;
