import cron from "node-cron";
import Informe from "../models/informe.model";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";

const ZONA_HORARIA_UTC = "UTC";

function obtenerFechaCierre(periodo: string | Date): Date {
  const fechaInforme = periodo instanceof Date ? periodo : new Date(periodo);
  const anio = fechaInforme.getUTCFullYear();
  const trimestre = Math.floor(fechaInforme.getUTCMonth() / 3) + 1;
  const diaCierre = trimestre === 3 && anio === 2026 ? 14 : 8;
  return new Date(Date.UTC(anio, trimestre * 3, diaCierre, 5, 5));
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
        await Informe.update(
          { estado: ESTADO_INFORME_ENUM.CERRADO },
          {
            where: {
              id: informe.getDataValue("id"),
              estado: ESTADO_INFORME_ENUM.ABIERTO,
            },
          },
        );
        informesCerrados += 1;
      }
    }

    console.info(
      `Cierre trimestral ejecutado. Informes cerrados: ${informesCerrados}`,
    );
  } catch (error) {
    console.error("Error cerrando informes trimestrales:", error);
  }
};

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
