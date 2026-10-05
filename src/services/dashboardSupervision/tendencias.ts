import { DASHBOARD_SUPERVISION_CONFIG } from "../../config/dashboardSupervision.config";
import { calcularVariacion } from "./variacion";

export type DireccionTendencia = "DISMINUCION" | "CRECIMIENTO";

export interface TendenciaConsecutiva {
  direccion: DireccionTendencia;
  /** Cantidad de variaciones consecutivas (p. ej. 3 = cuatro trimestres con tres cambios seguidos). */
  periodos: number;
  /** Variaciones porcentuales que forman la tendencia, de la más antigua a la más reciente. */
  variaciones: number[];
}

/**
 * Busca, desde el valor más reciente hacia atrás, una racha de variaciones en la misma dirección.
 * Un valor nulo (sin informe o sin dato) interrumpe la racha: nunca se interpreta como 0.
 *
 * @param valores serie ordenada del periodo más antiguo al más reciente.
 */
export const detectarTendenciaConsecutiva = (
  valores: (number | null)[],
  minimo: number = DASHBOARD_SUPERVISION_CONFIG.tendencia.periodosConsecutivos,
  variacionMinima: number = DASHBOARD_SUPERVISION_CONFIG.tendencia.variacionMinima,
): TendenciaConsecutiva | null => {
  let direccion: DireccionTendencia | null = null;
  const variaciones: number[] = [];

  for (let i = valores.length - 1; i > 0; i--) {
    const variacion = calcularVariacion(valores[i - 1], valores[i]);
    if (variacion.estado !== "VARIACION" || variacion.porcentaje === null) {
      break;
    }

    const porcentaje = variacion.porcentaje;
    const paso: DireccionTendencia | null =
      porcentaje < 0 && Math.abs(porcentaje) >= variacionMinima && porcentaje !== 0
        ? "DISMINUCION"
        : porcentaje > 0 && porcentaje >= variacionMinima
          ? "CRECIMIENTO"
          : null;

    if (!paso || (direccion && paso !== direccion)) {
      break;
    }

    direccion = paso;
    variaciones.unshift(porcentaje);
  }

  if (!direccion || variaciones.length < minimo) {
    return null;
  }

  return { direccion, periodos: variaciones.length, variaciones };
};
