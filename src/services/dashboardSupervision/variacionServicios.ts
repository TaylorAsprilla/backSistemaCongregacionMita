import { TendenciaVariacion, Variacion } from "./variacion";

/**
 * Agrupa congregaciones según cómo varió el promedio de asistencia de cada
 * servicio entre el periodo consultado y el de comparación. Solo describe
 * la variación; no califica ni ordena congregaciones.
 */

export type ClaveServicio = "general" | "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

export type GrupoVariacion = TendenciaVariacion | "SIN_COMPARACION";

export const SERVICIOS_VARIACION: { clave: ClaveServicio; etiqueta: string; indicador: string }[] = [
  { clave: "general", etiqueta: "Todos los servicios", indicador: "promedioAsistenciaServicio" },
  { clave: "martes", etiqueta: "Servicio del martes", indicador: "promedioServicioMartes" },
  { clave: "jueves", etiqueta: "Servicio del jueves", indicador: "promedioServicioJueves" },
  { clave: "sabado", etiqueta: "Servicio del sábado", indicador: "promedioServicioSabado" },
  { clave: "domingo", etiqueta: "Servicio del domingo", indicador: "promedioServicioDomingo" },
  { clave: "lunes", etiqueta: "Servicio del lunes", indicador: "promedioServicioLunes" },
  { clave: "miercoles", etiqueta: "Servicio del miércoles", indicador: "promedioServicioMiercoles" },
  { clave: "viernes", etiqueta: "Servicio del viernes", indicador: "promedioServicioViernes" },
];

export const GRUPOS_VARIACION: GrupoVariacion[] = [
  "DISMINUCION_SIGNIFICATIVA",
  "DISMINUCION_MODERADA",
  "ESTABLE",
  "INCREMENTO_MODERADO",
  "INCREMENTO_SIGNIFICATIVO",
  "SIN_COMPARACION",
];

/** Filtros agrupados aceptados además de cada grupo individual. */
export const FILTROS_VARIACION_AGRUPADOS: Record<string, GrupoVariacion[]> = {
  DISMINUYO: ["DISMINUCION_SIGNIFICATIVA", "DISMINUCION_MODERADA"],
  AUMENTO: ["INCREMENTO_MODERADO", "INCREMENTO_SIGNIFICATIVO"],
};

export const servicioVariacion = (clave: string | undefined) =>
  SERVICIOS_VARIACION.find((s) => s.clave === clave);

export const grupoDeVariacion = (variacion: Variacion | null | undefined): GrupoVariacion =>
  variacion?.tendencia ?? "SIN_COMPARACION";

/** Devuelve los grupos que cubre un filtro, o `null` si el valor no es válido. */
export const gruposDeFiltro = (filtro: string | undefined): GrupoVariacion[] | null => {
  if (!filtro) return null;
  if (FILTROS_VARIACION_AGRUPADOS[filtro]) return FILTROS_VARIACION_AGRUPADOS[filtro];
  return (GRUPOS_VARIACION as string[]).includes(filtro) ? [filtro as GrupoVariacion] : null;
};

export const contarPorGrupo = (
  variaciones: (Variacion | null | undefined)[],
): Record<GrupoVariacion, number> => {
  const conteo = Object.fromEntries(GRUPOS_VARIACION.map((g) => [g, 0])) as Record<
    GrupoVariacion,
    number
  >;
  for (const v of variaciones) conteo[grupoDeVariacion(v)] += 1;
  return conteo;
};
