import {
  AlertaDTO,
  TipoAlerta,
  UnidadRef,
} from "../../types/dashboardSupervision.dto";
import { DASHBOARD_SUPERVISION_CONFIG } from "../../config/dashboardSupervision.config";
import { normalizarTexto } from "./clasificacion";
import { AgregadoMetricas, INDICADORES } from "./metricas";
import { detectarTendenciaConsecutiva } from "./tendencias";
import { calcularVariacion, formatearNumero } from "./variacion";

const claveUnidad = (unidad: UnidadRef) => `${unidad.tipo}-${unidad.id}`;

const nombreUnidad = (unidad: UnidadRef) =>
  unidad.tipo === "CAMPO"
    ? `el campo ${unidad.nombre}`
    : `la congregación ${unidad.nombre}`;

export const ORDEN_TIPOS_ALERTA: TipoAlerta[] = [
  "INFORME_PENDIENTE",
  "TENDENCIA_DISMINUCION",
  "DISMINUCION",
  "ASUNTO_RECURRENTE",
  "TENDENCIA_CRECIMIENTO",
  "INCREMENTO",
];

export const alertaInformePendiente = (
  unidad: UnidadRef,
  etiquetaPeriodo: string,
): AlertaDTO => ({
  id: `${claveUnidad(unidad)}-INFORME_PENDIENTE`,
  tipo: "INFORME_PENDIENTE",
  nivel: "ATENCION",
  unidad,
  indicador: null,
  etiquetaIndicador: null,
  mensaje: `No se ha registrado el informe de ${etiquetaPeriodo} para ${nombreUnidad(unidad)}.`,
  periodo: etiquetaPeriodo,
  detalle: {},
});

/** Alertas por variaciones significativas entre el periodo seleccionado y el de comparación. */
export const alertasVariacion = (
  unidad: UnidadRef,
  actual: AgregadoMetricas,
  comparacion: AgregadoMetricas,
  etiquetaPeriodo: string,
  etiquetaComparacion: string,
): AlertaDTO[] => {
  if (actual.informes <= 0 || comparacion.informes <= 0) return [];

  const alertas: AlertaDTO[] = [];
  for (const indicador of INDICADORES) {
    if (!indicador.alertable) continue;

    const variacion = calcularVariacion(indicador.extraer(comparacion), indicador.extraer(actual));
    if (variacion.porcentaje === null) continue;

    const tipo: TipoAlerta | null =
      variacion.tendencia === "DISMINUCION_SIGNIFICATIVA"
        ? "DISMINUCION"
        : variacion.tendencia === "INCREMENTO_SIGNIFICATIVO"
          ? "INCREMENTO"
          : null;
    if (!tipo) continue;

    const verbo = tipo === "DISMINUCION" ? "disminuyó" : "aumentó";
    alertas.push({
      id: `${claveUnidad(unidad)}-${tipo}-${indicador.clave}`,
      tipo,
      nivel: tipo === "DISMINUCION" ? "ATENCION" : "INFORMATIVA",
      unidad,
      indicador: indicador.clave,
      etiquetaIndicador: indicador.etiqueta,
      mensaje: `${indicador.etiqueta} ${verbo} ${formatearNumero(Math.abs(variacion.porcentaje))} % en ${etiquetaPeriodo} respecto a ${etiquetaComparacion} (${formatearNumero(variacion.anterior ?? 0)} → ${formatearNumero(variacion.actual ?? 0)}).`,
      periodo: etiquetaPeriodo,
      detalle: {
        anterior: variacion.anterior,
        actual: variacion.actual,
        porcentaje: variacion.porcentaje,
      },
    });
  }
  return alertas;
};

/**
 * Alertas de tendencia sobre el histórico de la unidad.
 * @param historico agregados del periodo más antiguo al seleccionado.
 */
export const alertasTendencia = (
  unidad: UnidadRef,
  historico: AgregadoMetricas[],
  etiquetaPeriodo: string,
): AlertaDTO[] => {
  const alertas: AlertaDTO[] = [];
  for (const indicador of INDICADORES) {
    if (!indicador.alertable) continue;

    const serie = historico.map((ag) => indicador.extraer(ag));
    const tendencia = detectarTendenciaConsecutiva(serie);
    if (!tendencia) continue;

    const tipo: TipoAlerta =
      tendencia.direccion === "DISMINUCION" ? "TENDENCIA_DISMINUCION" : "TENDENCIA_CRECIMIENTO";
    const descripcion = tendencia.direccion === "DISMINUCION" ? "disminución" : "crecimiento";

    alertas.push({
      id: `${claveUnidad(unidad)}-${tipo}-${indicador.clave}`,
      tipo,
      nivel: tipo === "TENDENCIA_DISMINUCION" ? "ATENCION" : "INFORMATIVA",
      unidad,
      indicador: indicador.clave,
      etiquetaIndicador: indicador.etiqueta,
      mensaje: `${indicador.etiqueta} muestra ${descripcion} durante ${tendencia.periodos} trimestres consecutivos hasta ${etiquetaPeriodo}.`,
      periodo: etiquetaPeriodo,
      detalle: {
        variaciones: tendencia.variaciones,
        trimestres: tendencia.periodos,
      },
    });
  }
  return alertas;
};

/**
 * Asuntos pendientes del periodo seleccionado que aparecen (mismo texto normalizado)
 * en los trimestres inmediatamente anteriores sin interrupción.
 *
 * @param asuntosPorPeriodo textos de asuntos por periodo, del más antiguo al seleccionado.
 *                          `null` = la unidad no tiene informe en ese periodo.
 * @returns asunto (texto original del periodo actual) y cantidad de trimestres consecutivos.
 */
export const detectarAsuntosRecurrentes = (
  asuntosPorPeriodo: (string[] | null)[],
  minimo: number = DASHBOARD_SUPERVISION_CONFIG.asuntosRecurrentes.trimestresConsecutivos,
): { asunto: string; trimestres: number }[] => {
  const actual = asuntosPorPeriodo[asuntosPorPeriodo.length - 1];
  if (!actual?.length) return [];

  const conjuntos = asuntosPorPeriodo.map((lista) =>
    lista ? new Set(lista.map(normalizarTexto).filter(Boolean)) : null,
  );

  const resultado = new Map<string, { asunto: string; trimestres: number }>();
  for (const asunto of actual) {
    const clave = normalizarTexto(asunto);
    if (!clave || resultado.has(clave)) continue;

    let trimestres = 0;
    for (let i = conjuntos.length - 1; i >= 0; i--) {
      if (!conjuntos[i]?.has(clave)) break;
      trimestres++;
    }

    if (trimestres >= minimo) {
      resultado.set(clave, { asunto: asunto.trim(), trimestres });
    }
  }
  return [...resultado.values()];
};

export const alertasAsuntosRecurrentes = (
  unidad: UnidadRef,
  recurrentes: { asunto: string; trimestres: number }[],
  etiquetaPeriodo: string,
): AlertaDTO[] =>
  recurrentes.map((item) => ({
    id: `${claveUnidad(unidad)}-ASUNTO_RECURRENTE-${normalizarTexto(item.asunto).slice(0, 40)}`,
    tipo: "ASUNTO_RECURRENTE" as TipoAlerta,
    nivel: "ATENCION" as const,
    unidad,
    indicador: "asuntosPendientes",
    etiquetaIndicador: "Asuntos pendientes",
    mensaje: `El asunto pendiente "${item.asunto}" se ha reportado durante ${item.trimestres} trimestres consecutivos.`,
    periodo: etiquetaPeriodo,
    detalle: { asunto: item.asunto, trimestres: item.trimestres },
  }));

export const contarPorTipo = (alertas: AlertaDTO[]): Record<string, number> => {
  const conteo: Record<string, number> = Object.fromEntries(
    ORDEN_TIPOS_ALERTA.map((tipo) => [tipo, 0]),
  );
  for (const alerta of alertas) {
    conteo[alerta.tipo] = (conteo[alerta.tipo] ?? 0) + 1;
  }
  return conteo;
};

export const ordenarAlertas = (alertas: AlertaDTO[]): AlertaDTO[] =>
  [...alertas].sort(
    (a, b) =>
      ORDEN_TIPOS_ALERTA.indexOf(a.tipo) - ORDEN_TIPOS_ALERTA.indexOf(b.tipo) ||
      a.unidad.nombre.localeCompare(b.unidad.nombre, "es"),
  );
