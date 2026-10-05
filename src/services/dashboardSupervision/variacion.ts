import {
  DASHBOARD_SUPERVISION_CONFIG,
  UmbralesVariacion,
} from "../../config/dashboardSupervision.config";

export type EstadoVariacion =
  | "VARIACION"
  | "SIN_BASE_COMPARATIVA"
  | "SIN_ACTIVIDAD"
  | "SIN_INFORMACION_PREVIA"
  | "INFORMACION_ACTUAL_INCOMPLETA"
  | "SIN_INFORMACION";

export type TendenciaVariacion =
  | "INCREMENTO_SIGNIFICATIVO"
  | "INCREMENTO_MODERADO"
  | "ESTABLE"
  | "DISMINUCION_MODERADA"
  | "DISMINUCION_SIGNIFICATIVA";

export type DireccionVariacion = "SUBE" | "BAJA" | "ESTABLE";

export interface Variacion {
  anterior: number | null;
  actual: number | null;
  diferencia: number | null;
  porcentaje: number | null;
  estado: EstadoVariacion;
  tendencia: TendenciaVariacion | null;
  direccion: DireccionVariacion | null;
  /** Texto listo para mostrar: "↓ 15,6 %", "Sin actividad registrada", etc. */
  mensaje: string;
}

export const MENSAJES_VARIACION: Record<Exclude<EstadoVariacion, "VARIACION">, string> = {
  SIN_BASE_COMPARATIVA: "Nuevo registro / Sin base comparativa",
  SIN_ACTIVIDAD: "Sin actividad registrada",
  SIN_INFORMACION_PREVIA: "Sin información previa para comparar",
  INFORMACION_ACTUAL_INCOMPLETA: "Información actual incompleta",
  SIN_INFORMACION: "Sin información registrada",
};

const esNumero = (valor: number | null | undefined): valor is number =>
  typeof valor === "number" && Number.isFinite(valor);

export const redondear = (valor: number, decimales = 2): number => {
  const factor = 10 ** decimales;
  const resultado = (Math.sign(valor) * Math.round((Math.abs(valor) + Number.EPSILON) * factor)) / factor;
  return resultado === 0 ? 0 : resultado;
};

/** Promedio seguro: devuelve `null` cuando no hay base (nunca NaN ni Infinity). */
export const calcularPromedio = (
  total: number | null | undefined,
  cantidad: number | null | undefined,
): number | null => {
  if (!esNumero(total) || !esNumero(cantidad) || cantidad <= 0) {
    return null;
  }
  return redondear(total / cantidad);
};

export const clasificarPorcentaje = (
  porcentaje: number,
  umbrales: UmbralesVariacion = DASHBOARD_SUPERVISION_CONFIG.umbrales,
): TendenciaVariacion => {
  if (porcentaje >= umbrales.significativo) return "INCREMENTO_SIGNIFICATIVO";
  if (porcentaje >= umbrales.moderado) return "INCREMENTO_MODERADO";
  if (porcentaje <= -umbrales.significativo) return "DISMINUCION_SIGNIFICATIVA";
  if (porcentaje <= -umbrales.moderado) return "DISMINUCION_MODERADA";
  return "ESTABLE";
};

export const direccionDeTendencia = (
  tendencia: TendenciaVariacion,
): DireccionVariacion => {
  if (tendencia.startsWith("INCREMENTO")) return "SUBE";
  if (tendencia.startsWith("DISMINUCION")) return "BAJA";
  return "ESTABLE";
};

/** Formato es-ES con un decimal: 15.63 -> "15,6". */
export const formatearNumero = (valor: number, decimales = 1): string =>
  redondear(valor, decimales).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });

export const formatearPorcentaje = (
  porcentaje: number,
  direccion: DireccionVariacion,
): string => {
  const flecha = direccion === "SUBE" ? "↑" : direccion === "BAJA" ? "↓" : "→";
  return `${flecha} ${formatearNumero(Math.abs(porcentaje))} %`;
};

/**
 * Variación % = ((actual - anterior) / anterior) × 100
 *
 * Reglas de borde:
 *  - anterior y actual nulos  -> SIN_INFORMACION
 *  - anterior nulo            -> SIN_INFORMACION_PREVIA
 *  - actual nulo              -> INFORMACION_ACTUAL_INCOMPLETA
 *  - anterior 0 y actual 0    -> SIN_ACTIVIDAD
 *  - anterior 0 y actual > 0  -> SIN_BASE_COMPARATIVA (nunca "+5000 %")
 */
export const calcularVariacion = (
  anterior: number | null | undefined,
  actual: number | null | undefined,
  umbrales: UmbralesVariacion = DASHBOARD_SUPERVISION_CONFIG.umbrales,
): Variacion => {
  const valorAnterior = esNumero(anterior) ? anterior : null;
  const valorActual = esNumero(actual) ? actual : null;

  const sinPorcentaje = (estado: Exclude<EstadoVariacion, "VARIACION">): Variacion => ({
    anterior: valorAnterior,
    actual: valorActual,
    diferencia:
      valorAnterior !== null && valorActual !== null
        ? redondear(valorActual - valorAnterior)
        : null,
    porcentaje: null,
    estado,
    tendencia: null,
    direccion: null,
    mensaje: MENSAJES_VARIACION[estado],
  });

  if (valorAnterior === null && valorActual === null) {
    return sinPorcentaje("SIN_INFORMACION");
  }
  if (valorAnterior === null) {
    return sinPorcentaje("SIN_INFORMACION_PREVIA");
  }
  if (valorActual === null) {
    return sinPorcentaje("INFORMACION_ACTUAL_INCOMPLETA");
  }
  if (valorAnterior === 0 && valorActual === 0) {
    return sinPorcentaje("SIN_ACTIVIDAD");
  }
  if (valorAnterior === 0) {
    return sinPorcentaje("SIN_BASE_COMPARATIVA");
  }

  const porcentaje = redondear(
    ((valorActual - valorAnterior) / Math.abs(valorAnterior)) * 100,
  );
  const tendencia = clasificarPorcentaje(porcentaje, umbrales);
  const direccion = direccionDeTendencia(tendencia);

  return {
    anterior: valorAnterior,
    actual: valorActual,
    diferencia: redondear(valorActual - valorAnterior),
    porcentaje,
    estado: "VARIACION",
    tendencia,
    direccion,
    mensaje: formatearPorcentaje(porcentaje, direccion),
  };
};
