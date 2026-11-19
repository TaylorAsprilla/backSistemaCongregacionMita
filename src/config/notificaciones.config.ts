const enteros = (valor: string | undefined, porDefecto: number[]): number[] => {
  const lista = (valor ?? "")
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return lista.length ? [...new Set(lista)].sort((a, b) => b - a) : porDefecto;
};

const entero = (valor: string | undefined, porDefecto: number): number => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
};

/**
 * Parámetros del centro de notificaciones. Todo es configurable por variable de entorno
 * (los umbrales de variación de las alertas de supervisión se comparten con el dashboard:
 * `DASHBOARD_SUPERVISION_CONFIG.umbrales`).
 */
export const NOTIFICACIONES_CONFIG = {
  paginacion: { porPaginaDefecto: 20, porPaginaMaximo: 50 },

  /** Política de conservación: las leídas y las no leídas se depuran pasado este tiempo. */
  retencion: {
    leidasDias: entero(process.env.NOTIF_RETENCION_LEIDAS_DIAS, 90),
    noLeidasDias: entero(process.env.NOTIF_RETENCION_NO_LEIDAS_DIAS, 365),
  },

  /**
   * Recordatorios de informe pendiente: se envían cuando faltan, como máximo, esos días para la
   * fecha de cierre del periodo (definida en `helpers/periodoInforme.ts`; no se inventan vencimientos).
   */
  informePendiente: {
    diasAntes: enteros(process.env.NOTIF_INFORME_DIAS_ANTES, [7, 3, 1]),
  },

  supervision: {
    /** INFORME_PENDIENTE se cubre con los recordatorios por fecha límite. */
    tiposExcluidos: ["INFORME_PENDIENTE"] as string[],
    /** Tope de alertas nuevas por administrador en cada ejecución. */
    maximoPorEjecucion: entero(process.env.NOTIF_SUPERVISION_MAX, 200),
  },
};
