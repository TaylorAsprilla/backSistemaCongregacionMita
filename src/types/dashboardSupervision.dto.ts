import { ModoComparacion } from "../services/dashboardSupervision/periodos";
import { Variacion } from "../services/dashboardSupervision/variacion";
import {
  CategoriaActividad,
} from "../services/dashboardSupervision/clasificacion";
import { GrupoIndicador } from "../services/dashboardSupervision/metricas";
import {
  ClaveServicio,
  GrupoVariacion,
} from "../services/dashboardSupervision/variacionServicios";

/** PAIS = Congregación País, CONGREGACION = Congregación Ciudad, CAMPO = Congregación Campo. */
export type TipoUnidad = "PAIS" | "CONGREGACION" | "CAMPO";

/**
 * ENTREGADO       informe del periodo cerrado
 * EN_ELABORACION  informe del periodo abierto
 * PENDIENTE       la unidad tiene obrero asignado pero no hay informe del periodo
 * SIN_OBRERO      la unidad no tiene obrero asignado
 */
export type EstadoEntrega = "ENTREGADO" | "EN_ELABORACION" | "PENDIENTE" | "SIN_OBRERO";

export type OrdenUnidades =
  | "NOMBRE"
  | "PAIS"
  | "CONGREGACION"
  | "MAYOR_INCREMENTO"
  | "MAYOR_DISMINUCION"
  | "MAS_ALERTAS";

export interface FiltrosDashboard {
  anio: number;
  trimestre: number;
  pais_id: number | null;
  congregacion_id: number | null;
  campo_id: number | null;
  comparacion: ModoComparacion;
}

export interface PeriodoDTO {
  anio: number;
  trimestre: number;
  /** "Q3 2026" */
  etiqueta: string;
  /** "tercer trimestre de 2026" */
  nombre: string;
  /** "2026-07-01" */
  fechaInicio: string;
}

export interface ContextoDashboard {
  filtros: FiltrosDashboard;
  periodo: PeriodoDTO;
  periodoComparacion: PeriodoDTO;
  descripcionComparacion: string;
  generadoEn: string;
}

export interface UnidadRef {
  tipo: TipoUnidad;
  id: number;
  nombre: string;
  pais_id: number | null;
  pais: string | null;
  congregacion_id: number | null;
  congregacion: string | null;
}

export interface ObreroDTO {
  id: number;
  nombre: string;
  email: string | null;
}

export interface IndicadorDTO {
  clave: string;
  etiqueta: string;
  grupo: GrupoIndicador;
  formato: "ENTERO" | "DECIMAL";
  /** Valor del periodo seleccionado considerando todos los informes del alcance. */
  valorPeriodo: number | null;
  /** Variación calculada sólo con unidades que tienen informe en ambos periodos. */
  variacion: Variacion;
}

export interface CoberturaDTO {
  unidades: number;
  /** Cantidad de congregaciones por tipo (país, ciudad y campo). */
  porTipo: Record<TipoUnidad, number>;
  conObrero: number;
  entregados: number;
  enElaboracion: number;
  pendientes: number;
  sinObrero: number;
  /** % de unidades con obrero que ya tienen informe (abierto o cerrado). */
  porcentajeConInforme: number | null;
  informesPeriodo: number;
  /** Unidades con informe en ambos periodos (base de las variaciones). */
  unidadesComparadas: number;
}

export interface AsistenciaServicioDTO {
  categoria: CategoriaActividad;
  etiqueta: string;
  cantidad: number | null;
  asistencia: number | null;
  promedio: number | null;
  variacionPromedio: Variacion;
}

export interface CategoriaEspiritualDTO {
  id: number;
  nombre: string;
  valorPeriodo: number | null;
  variacion: Variacion;
}

export interface MonedaDTO {
  disponible: boolean;
  montoRecaudado: number | null;
  mensaje: string;
}

export interface ResumenDTO {
  contexto: ContextoDashboard;
  cobertura: CoberturaDTO;
  indicadores: IndicadorDTO[];
  asistenciaPorServicio: AsistenciaServicioDTO[];
  /** Cantidad de congregaciones por tipo de variación del promedio de asistencia de cada servicio. */
  variacionPorServicio: VariacionServicioDTO[];
  /** Estado del informe trimestral de las Congregaciones Ciudad, agrupado por país. */
  entregaPorPais: EntregaPaisDTO[];
  actividadesEspiritualesPorCategoria: CategoriaEspiritualDTO[];
  actividadEconomica: MonedaDTO;
  alertas: { total: number; porTipo: Record<string, number> };
}

export interface EntregaPaisDTO {
  pais_id: number | null;
  pais: string;
  /** Total de Congregaciones Ciudad del país. */
  total: number;
  entregados: number;
  enElaboracion: number;
  pendientes: number;
  sinObrero: number;
  /** % de congregaciones con informe (entregado o en elaboración) sobre el total. */
  porcentajeConInforme: number | null;
}

export interface VariacionServicioDTO {
  clave: ClaveServicio;
  etiqueta: string;
  indicador: string;
  conteo: Record<GrupoVariacion, number>;
}

export interface PuntoSerieDTO {
  periodo: string;
  valor: number | null;
}

export interface SerieDTO {
  clave: string;
  etiqueta: string;
  formato: "ENTERO" | "DECIMAL";
  puntos: PuntoSerieDTO[];
}

export interface TendenciasDTO {
  contexto: ContextoDashboard;
  periodos: PeriodoDTO[];
  informesPorPeriodo: PuntoSerieDTO[];
  series: SerieDTO[];
}

export type TipoAlerta =
  | "INFORME_PENDIENTE"
  | "DISMINUCION"
  | "INCREMENTO"
  | "TENDENCIA_DISMINUCION"
  | "TENDENCIA_CRECIMIENTO"
  | "ASUNTO_RECURRENTE";

export type NivelAlerta = "ATENCION" | "INFORMATIVA";

export interface AlertaDTO {
  id: string;
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  unidad: UnidadRef;
  indicador: string | null;
  etiquetaIndicador: string | null;
  mensaje: string;
  periodo: string;
  detalle: {
    anterior?: number | null;
    actual?: number | null;
    porcentaje?: number | null;
    variaciones?: number[];
    trimestres?: number;
    asunto?: string;
  };
}

export interface AlertasDTO {
  contexto: ContextoDashboard;
  total: number;
  porTipo: Record<string, number>;
  alertas: AlertaDTO[];
}

export interface UnidadFilaDTO {
  unidad: UnidadRef;
  obreros: string[];
  estadoEntrega: EstadoEntrega;
  informes: number;
  indicadores: Record<string, Variacion>;
  alertas: number;
}

export interface UnidadesDTO {
  contexto: ContextoDashboard;
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
  unidades: UnidadFilaDTO[];
}

export interface InformeResumenDTO {
  id: number;
  periodo: string;
  estado: string;
  obrero: string;
  creado: string | null;
}

export interface DetalleUnidadDTO {
  contexto: ContextoDashboard;
  unidad: UnidadRef;
  obreros: ObreroDTO[];
  estadoEntrega: EstadoEntrega;
  informes: InformeResumenDTO[];
  indicadores: IndicadorDTO[];
  asistenciaPorServicio: AsistenciaServicioDTO[];
  historico: { periodos: PeriodoDTO[]; series: SerieDTO[] };
  logros: { logro: string; responsable: string | null; fecha: string | null }[];
  metas: { meta: string; accion: string | null; fecha: string | null; fechaCumplimiento: string | null }[];
  asuntosPendientes: { asunto: string; tipoAsunto: string | null; responsable: string | null; recurrente: boolean }[];
  alertas: AlertaDTO[];
}

export interface OpcionFiltroDTO {
  id: number;
  nombre: string;
  pais_id?: number | null;
  congregacion_id?: number | null;
}

export interface FiltrosDisponiblesDTO {
  periodoActivo: PeriodoDTO;
  anios: number[];
  trimestres: { valor: number; etiqueta: string }[];
  comparaciones: { valor: ModoComparacion; etiqueta: string }[];
  paises: OpcionFiltroDTO[];
  congregaciones: OpcionFiltroDTO[];
  campos: OpcionFiltroDTO[];
  umbrales: { significativo: number; moderado: number };
  /** Reglas usadas para generar alertas (para explicarlas en pantalla). */
  reglasAlertas: {
    trimestresTendencia: number;
    trimestresAsuntoRecurrente: number;
    trimestresHistorico: number;
  };
}
