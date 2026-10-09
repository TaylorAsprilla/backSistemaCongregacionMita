import cron from "node-cron";
import Informe from "../models/informe.model";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";

const ZONA_HORARIA_COLOMBIA = "America/Bogota";

function obtenerFechaCierre(periodo: string | Date): Date {
  const fechaInforme = periodo instanceof Date ? periodo : new Date(periodo);
  const trimestre = Math.floor(fechaInforme.getUTCMonth() / 3);
  return new Date(Date.UTC(fechaInforme.getUTCFullYear(), (trimestre + 1) * 3, 10, 5, 5));
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
  cron.schedule("5 0 * * *", closeExpiredQuarterlyReports, {
    timezone: ZONA_HORARIA_COLOMBIA,
  });
  console.info(
    "Cron de cierre de informes configurado para ejecutarse diariamente a las 00:05, hora de Colombia.",
  );
} else {
  console.info(`Cron de cierre de informes desactivado en entorno: ${nodeEnv}`);
}

export default closeExpiredQuarterlyReports;
