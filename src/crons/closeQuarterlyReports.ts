import cron from "node-cron";
import Informe from "../models/informe.model";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";

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
      const fechaCreacion = new Date(informe.getDataValue("createdAt"));
      const trimestre = Math.floor(fechaCreacion.getMonth() / 3);
      const finTrimestre = new Date(
        fechaCreacion.getFullYear(),
        (trimestre + 1) * 3,
        0,
        23,
        59,
        59,
        999,
      );
      const fechaCierre = new Date(finTrimestre);
      fechaCierre.setDate(fechaCierre.getDate() + 8);

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
  cron.schedule("5 0 * * *", closeExpiredQuarterlyReports);
  console.info(
    "Cron de cierre de informes configurado para ejecutarse diariamente a las 00:05.",
  );
} else {
  console.info(`Cron de cierre de informes desactivado en entorno: ${nodeEnv}`);
}

export default closeExpiredQuarterlyReports;
