import cron from "node-cron";
import { ROLES_ID } from "../enum/roles.enum";
import { obtenerUsuariosConPermiso } from "../services/notificaciones/destinatarios";
import {
  claveSemana,
  generarAlertasSupervision,
  generarRecordatoriosInformePendiente,
  seguro,
} from "../services/notificaciones/eventos";
import { crearParaUsuarios, depurar } from "../services/notificaciones/notificacion.service";
import {
  obtenerCongregacionesAsignadas,
  obtenerSolicitudesPendientesPorCongregacion,
} from "./notifyPendingRequests";

/**
 * Tareas programadas del centro de notificaciones (solo en producción, como el resto de crons).
 * Todas son idempotentes: la clave del evento evita notificaciones repetidas si se ejecutan de nuevo.
 */

/** Recordatorios de informe pendiente, alertas de supervisión y depuración del historial. */
export const ejecutarTareasDiarias = async (ahora: Date = new Date()) => {
  const recordatorios = await generarRecordatoriosInformePendiente(ahora);
  const alertas = await generarAlertasSupervision(ahora);
  const depuradas = await seguro("depuración", depurar)(ahora);
  console.info(
    `[NOTIFICACIONES] Diario: recordatorios=${recordatorios ?? "error"}, alertas=${alertas ?? "error"}, depuradas=${depuradas ?? "error"}`,
  );
};

/** Aprobadores con solicitudes multimedia pendientes en su ámbito (misma regla que el aviso semanal por correo). */
export const notificarSolicitudesPendientes = seguro("solicitudes pendientes", async (ahora: Date = new Date()) => {
  const semana = claveSemana(ahora);
  const aprobadores = await obtenerUsuariosConPermiso([ROLES_ID.APROBADOR_MULTIMEDIA]);
  let creadas = 0;
  for (const aprobadorId of aprobadores) {
    const { condiciones } = await obtenerCongregacionesAsignadas(aprobadorId);
    if (!condiciones.length) continue;
    const pendientes = (await obtenerSolicitudesPendientesPorCongregacion(condiciones)).length;
    if (!pendientes) continue;
    creadas += await crearParaUsuarios([aprobadorId], {
      tipo: "SOLICITUD_PENDIENTE",
      categoria: "PENDIENTE",
      titulo: "Solicitudes pendientes de revisión",
      mensaje:
        pendientes === 1
          ? "Tiene 1 solicitud multimedia pendiente de revisión."
          : `Tiene ${pendientes} solicitudes multimedia pendientes de revisión.`,
      entidadTipo: "SOLICITUD_MULTIMEDIA",
      urlDestino: "/sistema/solicitudes-multimedia",
      claveEvento: `SOLICITUD_PENDIENTE:${aprobadorId}:${semana}`,
    });
  }
  return creadas;
});

const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production") {
  // Diario 05:30 UTC, después del cierre automático de informes (05:05 UTC).
  cron.schedule("30 5 * * *", () => void seguro("tareas diarias", ejecutarTareasDiarias)(), { timezone: "UTC" });
  // Lunes 14:30 UTC (9:30 en Colombia), junto al aviso semanal por correo a aprobadores.
  cron.schedule("30 14 * * 1", () => void notificarSolicitudesPendientes(), { timezone: "UTC" });
  console.info("Cron de notificaciones configurado (diario 05:30 UTC y semanal lunes 14:30 UTC).");
} else {
  console.info(`Cron de notificaciones desactivado en entorno: ${nodeEnv}`);
}
