import { DASHBOARD_SUPERVISION_CONFIG } from "../config/dashboardSupervision.config";
import { obtenerPeriodoInformeActivo } from "../helpers/periodoInforme";
import {
  AlertaDTO,
  AlertasDTO,
  AsistenciaServicioDTO,
  ContextoDashboard,
  DetalleUnidadDTO,
  EntregaPaisDTO,
  EstadoEntrega,
  FiltrosDashboard,
  FiltrosDisponiblesDTO,
  IndicadorDTO,
  OrdenUnidades,
  PeriodoDTO,
  ResumenDTO,
  SerieDTO,
  TendenciasDTO,
  TipoUnidad,
  UnidadFilaDTO,
  UnidadRef,
  UnidadesDTO,
} from "../types/dashboardSupervision.dto";
import {
  alertaInformePendiente,
  alertasAsuntosRecurrentes,
  alertasTendencia,
  alertasVariacion,
  contarPorTipo,
  detectarAsuntosRecurrentes,
  ordenarAlertas,
} from "./dashboardSupervision/alertas";
import {
  CATEGORIAS_SERVICIO,
  CategoriaActividad,
  clasificarActividad,
  ETIQUETAS_CATEGORIA_ACTIVIDAD,
  normalizarTexto,
} from "./dashboardSupervision/clasificacion";
import * as consultas from "./dashboardSupervision/consultas";
import { ciudadesDelDetalle, unidadesInformantes } from "./dashboardSupervision/alcance";
import { CatalogoJerarquia, parsearFiltros, validarJerarquia } from "./dashboardSupervision/jerarquia";
import {
  agregarInformes,
  AgregadoMetricas,
  crearAgregado,
  INDICADORES,
  INDICADORES_POR_CLAVE,
  INDICADORES_TENDENCIA,
  sumarValor,
} from "./dashboardSupervision/metricas";
import {
  clavePeriodo,
  compararPeriodos,
  coberturaTemporal,
  descripcionComparacion,
  etiquetaPeriodo,
  fechaFinExclusivaPeriodo,
  fechaInicioPeriodo,
  MODOS_COMPARACION,
  nombrePeriodo,
  Periodo,
  periodoComparacion,
  periodoDesdeFecha,
  periodosHistorico,
} from "./dashboardSupervision/periodos";
import { calcularPromedio, calcularVariacion, Variacion } from "./dashboardSupervision/variacion";
import {
  contarPorGrupo,
  grupoDeVariacion,
  gruposDeFiltro,
  SERVICIOS_VARIACION,
  servicioVariacion,
} from "./dashboardSupervision/variacionServicios";

export class ErrorDashboard extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

interface Unidad {
  clave: string;
  ref: UnidadRef;
  obreros: number[];
}

interface Catalogo extends CatalogoJerarquia {
  listaPaises: consultas.FilaPaisCatalogo[];
  listaCongregaciones: consultas.FilaCongregacion[];
  listaCampos: consultas.FilaCampo[];
  categoriasEspirituales: consultas.FilaPais[];
  nombrePais: Map<number, string>;
}

interface Dataset {
  filtros: FiltrosDashboard;
  contexto: ContextoDashboard;
  periodo: Periodo;
  comparacion: Periodo;
  historico: Periodo[];
  unidades: Unidad[];
  usuarios: Map<number, consultas.FilaUsuario>;
  informesPorUnidad: Map<string, Map<string, consultas.FilaInforme[]>>;
  metricas: Map<number, AgregadoMetricas>;
  asuntos: Map<number, consultas.FilaAsunto[]>;
  alertasPorUnidad: Map<string, AlertaDTO[]>;
  categoriasEspirituales: consultas.FilaPais[];
  actividades: consultas.FilaActividad[];
}

/* ------------------------------------------------------------------ */
/* Caché en memoria (por proceso)                                      */
/* ------------------------------------------------------------------ */

interface EntradaCache<T> {
  expira: number;
  valor: Promise<T>;
}

const cache = new Map<string, EntradaCache<unknown>>();

const conCache = <T>(clave: string, crear: () => Promise<T>): Promise<T> => {
  const ahora = Date.now();
  const existente = cache.get(clave) as EntradaCache<T> | undefined;
  if (existente && existente.expira > ahora) return existente.valor;

  for (const [k, entrada] of cache) {
    if (entrada.expira <= ahora) cache.delete(k);
  }

  const valor = crear();
  cache.set(clave, { expira: ahora + DASHBOARD_SUPERVISION_CONFIG.cacheSegundos * 1000, valor });
  valor.catch(() => cache.delete(clave));
  return valor;
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export const periodoActivo = (fecha = new Date()): Periodo =>
  periodoDesdeFecha(obtenerPeriodoInformeActivo(fecha)) as Periodo;

const periodoDTO = (periodo: Periodo): PeriodoDTO => ({
  anio: periodo.anio,
  trimestre: periodo.trimestre,
  etiqueta: etiquetaPeriodo(periodo),
  nombre: nombrePeriodo(periodo),
  fechaInicio: fechaInicioPeriodo(periodo),
});

const obtenerCatalogo = (): Promise<Catalogo> =>
  conCache("catalogo", async () => {
    const [paises, congregaciones, campos, categoriasEspirituales] = await Promise.all([
      consultas.obtenerPaises(),
      consultas.obtenerCongregaciones(),
      consultas.obtenerCampos(),
      consultas.obtenerCategoriasEspirituales(),
    ]);
    return {
      listaPaises: paises,
      listaCongregaciones: congregaciones,
      listaCampos: campos,
      categoriasEspirituales,
      paises: new Map(paises.map((p) => [p.id, p])),
      congregaciones: new Map(congregaciones.map((c) => [c.id, c])),
      campos: new Map(campos.map((c) => [c.id, c])),
      nombrePais: new Map(paises.map((p) => [p.id, p.nombre])),
    };
  });

const unidadesEnAlcance = (filtros: FiltrosDashboard, catalogo: Catalogo): Unidad[] => {
  const paisRef = (p: consultas.FilaPaisCatalogo): Unidad => ({
    clave: `PAIS-${p.id}`,
    obreros: p.obreros,
    ref: {
      tipo: "PAIS",
      id: p.id,
      nombre: p.nombre,
      pais_id: p.id,
      pais: p.nombre,
      congregacion_id: null,
      congregacion: null,
    },
  });

  const congregacionRef = (c: consultas.FilaCongregacion): Unidad => ({
    clave: `CONGREGACION-${c.id}`,
    obreros: c.obreros,
    ref: {
      tipo: "CONGREGACION",
      id: c.id,
      nombre: c.nombre,
      pais_id: c.pais_id,
      pais: c.pais_id !== null ? catalogo.nombrePais.get(c.pais_id) ?? null : null,
      congregacion_id: c.id,
      congregacion: c.nombre,
    },
  });

  const campoRef = (k: consultas.FilaCampo): Unidad => {
    const congregacion =
      k.congregacion_id !== null ? catalogo.congregaciones.get(k.congregacion_id) : undefined;
    const fila = congregacion as consultas.FilaCongregacion | undefined;
    return {
      clave: `CAMPO-${k.id}`,
      obreros: k.obreros,
      ref: {
        tipo: "CAMPO",
        id: k.id,
        nombre: k.nombre,
        pais_id: fila?.pais_id ?? null,
        pais: fila?.pais_id != null ? catalogo.nombrePais.get(fila.pais_id) ?? null : null,
        congregacion_id: k.congregacion_id,
        congregacion: fila?.nombre ?? null,
      },
    };
  };

  const campoSeleccionado =
    filtros.campo_id !== null
      ? catalogo.listaCampos.find((campo) => campo.id === filtros.campo_id)
      : undefined;

  const congregaciones = catalogo.listaCongregaciones.filter(
    (c) =>
      (filtros.congregacion_id === null || c.id === filtros.congregacion_id) &&
      (campoSeleccionado === undefined || c.id === campoSeleccionado.congregacion_id) &&
      (filtros.pais_id === null || c.pais_id === filtros.pais_id),
  );
  const idsCongregacion = new Set(congregaciones.map((c) => c.id));
  const campos = catalogo.listaCampos.filter(
    (k) =>
      k.congregacion_id !== null &&
      idsCongregacion.has(k.congregacion_id) &&
      (filtros.campo_id === null || k.id === filtros.campo_id),
  );

  // Los países y campos describen la jerarquía, pero solo las ciudades entregan informes.
  const paises =
    filtros.congregacion_id === null && filtros.campo_id === null
      ? catalogo.listaPaises.filter((p) => filtros.pais_id === null || p.id === filtros.pais_id)
      : [];

  return [...paises.map(paisRef), ...congregaciones.map(congregacionRef), ...campos.map(campoRef)];
};



const nombreObreros = (unidad: Unidad, usuarios: Map<number, consultas.FilaUsuario>) =>
  unidad.obreros.map((id) => usuarios.get(id)?.nombre || `Usuario ${id}`);

/* ------------------------------------------------------------------ */
/* Construcción del dataset                                            */
/* ------------------------------------------------------------------ */

const construirMetricas = async (informes: number[]) => {
  const metricas = new Map<number, AgregadoMetricas>();
  for (const id of informes) {
    metricas.set(id, { ...crearAgregado(), informes: 1 });
  }

  const [actividades, visitas, conteos, asuntos] = await Promise.all([
    consultas.obtenerActividades(informes),
    consultas.obtenerVisitas(informes),
    consultas.obtenerConteos(informes),
    consultas.obtenerAsuntos(informes),
  ]);

  const tieneActividad = new Set<number>();
  for (const fila of actividades) {
    const ag = metricas.get(fila.informe_id);
    if (!ag) continue;
    const categoria = clasificarActividad(fila.nombre, fila.diaSemana);
    sumarValor(ag.valores, `act.${categoria}.cantidad`, fila.cantidad);
    sumarValor(ag.valores, `act.${categoria}.asistencia`, fila.asistencia);
    sumarValor(ag.valores, "act.registros", fila.cantidad);
    tieneActividad.add(fila.informe_id);
  }

  for (const fila of visitas) {
    const ag = metricas.get(fila.informe_id);
    if (!ag || fila.registros <= 0) continue;
    ag.secciones.vis = 1;
    sumarValor(ag.valores, "vis.registros", fila.registros);
    sumarValor(ag.valores, "vis.hogares", fila.hogares);
    sumarValor(ag.valores, "vis.hospital", fila.hospital);
    sumarValor(ag.valores, "vis.remotas", fila.remotas);
    sumarValor(ag.valores, "vis.referidas", fila.referidas);
  }

  for (const fila of conteos) {
    const ag = metricas.get(fila.informe_id);
    if (!ag) continue;
    if (fila.clave === "sit") {
      sumarValor(ag.valores, "sit.total", fila.cantidad);
      sumarValor(ag.valores, "sit.seguimiento", fila.suma1);
    } else if (fila.clave === "eco") {
      sumarValor(ag.valores, "eco.cantidad", fila.cantidad);
      sumarValor(ag.valores, "eco.asistencia", fila.suma1);
      sumarValor(ag.valores, "eco.monto", fila.suma2);
    } else if (fila.clave.startsWith("esp.cat.")) {
      sumarValor(ag.valores, fila.clave, fila.cantidad);
      sumarValor(ag.valores, "esp.total", fila.cantidad);
    } else if (fila.clave.startsWith("asuntos.")) {
      sumarValor(ag.valores, fila.clave, fila.cantidad);
      sumarValor(ag.valores, "asuntos", fila.cantidad);
    } else {
      sumarValor(ag.valores, fila.clave, fila.cantidad);
    }
  }

  for (const id of tieneActividad) {
    const ag = metricas.get(id);
    if (ag) ag.secciones.act = 1;
  }

  const asuntosPorInforme = new Map<number, consultas.FilaAsunto[]>();
  for (const fila of asuntos) {
    const lista = asuntosPorInforme.get(fila.informe_id) ?? [];
    lista.push(fila);
    asuntosPorInforme.set(fila.informe_id, lista);
  }

  return { metricas, asuntos: asuntosPorInforme, actividades };
};

const informesDe = (ds: Dataset, unidad: Unidad, periodo: Periodo) =>
  ds.informesPorUnidad.get(unidad.clave)?.get(clavePeriodo(periodo)) ?? [];

/** Suma los informes indicados sin duplicar en agregados de la jerarquía. */
const agregadoDeInformes = (ds: Dataset, informes: Iterable<consultas.FilaInforme>) => {
  const ids = new Set<number>();
  for (const informe of informes) ids.add(informe.id);
  return agregarInformes([...ids].map((id) => ds.metricas.get(id)));
};

const agregadoUnidad = (ds: Dataset, unidad: Unidad, periodo: Periodo) =>
  agregadoDeInformes(ds, informesDe(ds, unidad, periodo));

const agregadoCerrado = (ds: Dataset, unidad: Unidad, periodo: Periodo) =>
  fechaInicioPeriodo(periodo) >= DASHBOARD_SUPERVISION_CONFIG.inicioCobertura &&
  fechaFinExclusivaPeriodo(periodo) <= new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
    ? agregadoDeInformes(ds, informesDe(ds, unidad, periodo).filter((i) => i.estado === "Cerrado"))
    : crearAgregado();

const variacionPeriodo = (ds: Dataset, anterior: number | null, actual: number | null): Variacion => {
  const cobertura = ds.contexto.coberturaTemporal;
  if (cobertura.comparable) return calcularVariacion(anterior, actual);
  return {
    ...calcularVariacion(null, actual),
    anterior,
    diferencia: null,
    mensaje: cobertura.mensaje,
  };
};

export const estadoEntrega = (
  tieneObrero: boolean,
  estados: string[],
): EstadoEntrega => {
  if (!tieneObrero) return "SIN_OBRERO";
  if (estados.includes("Cerrado")) return "ENTREGADO";
  if (estados.includes("Abierto")) return "EN_ELABORACION";
  return "PENDIENTE";
};

const estadoUnidad = (ds: Dataset, unidad: Unidad): EstadoEntrega =>
  estadoEntrega(
    unidad.obreros.length > 0,
    informesDe(ds, unidad, ds.periodo).map((i) => i.estado),
  );

const calcularAlertasUnidad = (ds: Dataset, unidad: Unidad): AlertaDTO[] => {
  if (ds.contexto.coberturaTemporal.sinCobertura) return [];
  const etiqueta = etiquetaPeriodo(ds.periodo);
  const etiquetaComparacion = etiquetaPeriodo(ds.comparacion);
  const alertas: AlertaDTO[] = [];

  if (estadoUnidad(ds, unidad) === "PENDIENTE" && !ds.contexto.integridad.informesSinAmbitoPeriodo) {
    alertas.push(alertaInformePendiente(unidad.ref, etiqueta));
  }

  if (ds.contexto.coberturaTemporal.comparable) alertas.push(
    ...alertasVariacion(
      unidad.ref,
      agregadoCerrado(ds, unidad, ds.periodo),
      agregadoCerrado(ds, unidad, ds.comparacion),
      etiqueta,
      etiquetaComparacion,
    ),
  );

  if (!ds.contexto.integridad.informesSinAmbitoHistorico) alertas.push(
    ...alertasTendencia(
      unidad.ref,
      ds.historico.map((p) => agregadoCerrado(ds, unidad, p)),
      etiqueta,
    ),
  );

  const asuntosPorPeriodo = ds.historico.map((p) => {
    const informes = informesDe(ds, unidad, p);
    if (!informes.length) return null;
    return informes.flatMap((i) => (ds.asuntos.get(i.id) ?? []).map((a) => a.asunto));
  });
  alertas.push(
    ...alertasAsuntosRecurrentes(unidad.ref, detectarAsuntosRecurrentes(asuntosPorPeriodo), etiqueta),
  );

  return alertas;
};

const construirDataset = async (filtros: FiltrosDashboard): Promise<Dataset> => {
  const catalogo = await obtenerCatalogo();
  const error = validarJerarquia(filtros, catalogo);
  if (error) throw new ErrorDashboard(error);

  const periodo: Periodo = { anio: filtros.anio, trimestre: filtros.trimestre };
  const comparacion = periodoComparacion(periodo, filtros.comparacion);
  const historico = periodosHistorico(periodo, DASHBOARD_SUPERVISION_CONFIG.trimestresHistorico)
    .filter((p) => fechaFinExclusivaPeriodo(p) > DASHBOARD_SUPERVISION_CONFIG.inicioCobertura);
  const inicio = [historico[0] ?? periodo, comparacion].sort(compararPeriodos)[0];

  const unidades = unidadesEnAlcance(filtros, catalogo);
  const idsObreros = [...new Set(unidades.flatMap((u) => u.obreros))];

  const [informes, usuarios, sinAmbito] = await Promise.all([
    consultas.obtenerInformes(idsObreros, fechaInicioPeriodo(inicio), fechaFinExclusivaPeriodo(periodo),
      unidades.map((u) => ({ tipo: u.ref.tipo, id: u.ref.id }))),
    consultas.obtenerUsuarios(idsObreros),
    consultas.obtenerInformesSinAmbito(fechaInicioPeriodo(inicio), fechaFinExclusivaPeriodo(periodo)),
  ]);
  const contarSinAmbito = (p: Periodo) =>
    sinAmbito.find((fila) => fila.periodo === fechaInicioPeriodo(p))?.cantidad ?? 0;
  const integridad = {
    informesSinAmbitoPeriodo: contarSinAmbito(periodo),
    informesSinAmbitoComparacion: contarSinAmbito(comparacion),
    informesSinAmbitoHistorico: historico.reduce((total, p) => total + contarSinAmbito(p), 0),
  };
  const temporal = coberturaTemporal(periodo, comparacion, DASHBOARD_SUPERVISION_CONFIG.inicioCobertura);
  if (temporal.comparable &&
    (integridad.informesSinAmbitoPeriodo || integridad.informesSinAmbitoComparacion)) {
    temporal.comparable = false;
    temporal.mensaje = "Comparación no disponible: hay informes sin Congregación identificada pendientes de conciliación.";
  }

  const informesPorAmbito = new Map<string, consultas.FilaInforme[]>();
  for (const informe of informes) {
    if (informe.periodo < DASHBOARD_SUPERVISION_CONFIG.inicioCobertura) continue;
    const clave = `${informe.tipo_congregacion}-${informe.congregacion_id}`;
    const lista = informesPorAmbito.get(clave) ?? [];
    lista.push(informe);
    informesPorAmbito.set(clave, lista);
  }

  const informesPorUnidad = new Map<string, Map<string, consultas.FilaInforme[]>>();
  for (const unidad of unidades) {
    const porPeriodo = new Map<string, consultas.FilaInforme[]>();
    for (const informe of informesPorAmbito.get(unidad.clave) ?? []) {
      const p = periodoDesdeFecha(informe.periodo);
      if (!p) continue;
      const clave = clavePeriodo(p);
      porPeriodo.set(clave, [...(porPeriodo.get(clave) ?? []), informe]);
    }
    informesPorUnidad.set(unidad.clave, porPeriodo);
  }

  const { metricas, asuntos, actividades } = await construirMetricas(informes.map((i) => i.id));

  const ds: Dataset = {
    filtros,
    periodo,
    comparacion,
    historico,
    unidades,
    usuarios: new Map(usuarios.map((u) => [u.id, u])),
    informesPorUnidad,
    metricas,
    asuntos,
    alertasPorUnidad: new Map(),
    categoriasEspirituales: catalogo.categoriasEspirituales,
    actividades,
    contexto: {
      filtros,
      periodo: periodoDTO(periodo),
      periodoComparacion: periodoDTO(comparacion),
      descripcionComparacion: descripcionComparacion(filtros.comparacion, comparacion),
      generadoEn: new Date().toISOString(),
      integridad,
      coberturaTemporal: temporal,
    },
  };

  for (const unidad of unidades) {
    ds.alertasPorUnidad.set(unidad.clave, calcularAlertasUnidad(ds, unidad));
  }

  return ds;
};

const obtenerDataset = (filtros: FiltrosDashboard) =>
  conCache(`dataset:${JSON.stringify(filtros)}`, () => construirDataset(filtros));

/** Convierte los parámetros HTTP en filtros validados (lanza ErrorDashboard si no son válidos). */
export const leerFiltros = (query: Record<string, unknown>): FiltrosDashboard => {
  const resultado = parsearFiltros(query, periodoActivo());
  if (!resultado.ok) throw new ErrorDashboard(resultado.msg);
  return resultado.valor;
};

export const obtenerListadoInformes = async (
  filtros: FiltrosDashboard,
  consulta: { busqueda?: string; pagina?: number; porPagina?: number },
) => {
  const catalogo = await obtenerCatalogo();
  const jerarquia = validarJerarquia(filtros, catalogo);
  if (jerarquia) throw new ErrorDashboard(jerarquia);
  const unidades = unidadesEnAlcance(filtros, catalogo).filter(
    (unidad) => filtros.campo_id === null || unidad.ref.tipo === "CAMPO",
  );
  const usuarios = [...new Set(unidades.flatMap((unidad) => unidad.obreros))];
  const resultado = await consultas.obtenerListadoInformes(
    fechaInicioPeriodo(filtros),
    fechaFinExclusivaPeriodo(filtros),
    consulta.busqueda ?? "",
    consulta.pagina ?? 1,
    Math.min(
      consulta.porPagina ?? DASHBOARD_SUPERVISION_CONFIG.paginacion.porPaginaDefecto,
      DASHBOARD_SUPERVISION_CONFIG.paginacion.porPaginaMaximo,
    ),
    usuarios,
  );
  const unidadesPorClave = new Map(
    unidades.map((unidad) => [`${unidad.ref.tipo}:${unidad.ref.id}`, unidad.ref]),
  );
  return {
    ...resultado,
    informes: resultado.informes.map((informe) => {
      const {
        tipo_congregacion, congregacion_id,
        nombre_pais, nombre_congregacion, nombre_campo,
        ...datos
      } = informe;
      const unidad = unidadesPorClave.get(`${tipo_congregacion}:${congregacion_id}`);
      const usarActual = informe.estado === "Abierto" && unidad !== undefined;
      const tieneAmbito = tipo_congregacion === "PAIS" ||
        tipo_congregacion === "CONGREGACION" || tipo_congregacion === "CAMPO";
      return {
        ...datos,
        pais: tieneAmbito ? (usarActual ? unidad.pais : nombre_pais ?? null) : null,
        ciudad: tipo_congregacion === "CONGREGACION" || tipo_congregacion === "CAMPO"
          ? (usarActual ? unidad.congregacion : nombre_congregacion ?? null)
          : null,
        campo: tipo_congregacion === "CAMPO"
          ? (usarActual ? unidad.nombre : nombre_campo ?? null)
          : null,
      };
    }),
  };
};

/* ------------------------------------------------------------------ */
/* Cálculos compartidos                                                */
/* ------------------------------------------------------------------ */

/** Compara las mismas unidades con informes cerrados y datos de la métrica en ambos periodos. */
const conjuntosComparables = (
  ds: Dataset,
  unidades: Unidad[],
  extraer?: (agregado: AgregadoMetricas) => number | null,
) => {
  const actuales: consultas.FilaInforme[] = [];
  const anteriores: consultas.FilaInforme[] = [];
  let unidadesComparadas = 0;

  if (!ds.contexto.coberturaTemporal.comparable) {
    return { actual: crearAgregado(), anterior: crearAgregado(), unidadesComparadas };
  }
  for (const unidad of unidades) {
    const actual = informesDe(ds, unidad, ds.periodo).filter((i) => i.estado === "Cerrado");
    const anterior = informesDe(ds, unidad, ds.comparacion).filter((i) => i.estado === "Cerrado");
    if (actual.length && anterior.length) {
      if (extraer && (extraer(agregadoDeInformes(ds, actual)) === null ||
        extraer(agregadoDeInformes(ds, anterior)) === null)) continue;
      unidadesComparadas++;
      actuales.push(...actual);
      anteriores.push(...anterior);
    }
  }

  return {
    actual: agregadoDeInformes(ds, actuales),
    anterior: agregadoDeInformes(ds, anteriores),
    unidadesComparadas,
  };
};

const informesPeriodo = (ds: Dataset, unidades: Unidad[], periodo: Periodo) =>
  unidades.flatMap((u) => informesDe(ds, u, periodo));

const construirIndicadores = (
  ds: Dataset,
  total: AgregadoMetricas,
  unidades: Unidad[],
): IndicadorDTO[] =>
  INDICADORES.map((indicador) => {
    const { actual, anterior } = conjuntosComparables(ds, unidades, indicador.extraer);
    return {
      clave: indicador.clave,
      etiqueta: indicador.etiqueta,
      grupo: indicador.grupo,
      formato: indicador.formato,
      valorPeriodo: indicador.extraer(total),
      variacion: variacionPeriodo(ds, indicador.extraer(anterior), indicador.extraer(actual)),
    };
  });

const CATEGORIAS_ASISTENCIA: CategoriaActividad[] = [...CATEGORIAS_SERVICIO, "CONSEJERO", "VIGILIA"];

const construirAsistenciaPorServicio = (
  ds: Dataset,
  total: AgregadoMetricas,
  unidades: Unidad[],
): AsistenciaServicioDTO[] => {
  const leer = (ag: AgregadoMetricas, cat: CategoriaActividad) => {
    if (ag.informes <= 0 || ag.secciones.act <= 0) {
      return { cantidad: null, asistencia: null, promedio: null };
    }
    const cantidad = ag.valores[`act.${cat}.cantidad`] ?? 0;
    const asistencia = ag.valores[`act.${cat}.asistencia`] ?? 0;
    return { cantidad, asistencia, promedio: calcularPromedio(asistencia, cantidad) };
  };

  return CATEGORIAS_ASISTENCIA.map((categoria) => {
    const periodo = leer(total, categoria);
    const { actual, anterior } = conjuntosComparables(ds, unidades, (ag) => leer(ag, categoria).promedio);
    return {
      categoria,
      etiqueta: ETIQUETAS_CATEGORIA_ACTIVIDAD[categoria],
      ...periodo,
      variacionPromedio: variacionPeriodo(ds,
        leer(anterior, categoria).promedio,
        leer(actual, categoria).promedio,
      ),
    };
  });
};

const construirSeries = (
  ds: Dataset,
  agregados: AgregadoMetricas[],
  claves: string[] = INDICADORES_TENDENCIA,
): SerieDTO[] =>
  claves
    .map((clave) => INDICADORES_POR_CLAVE.get(clave))
    .filter((i): i is NonNullable<typeof i> => !!i)
    .map((indicador) => ({
      clave: indicador.clave,
      etiqueta: indicador.etiqueta,
      formato: indicador.formato,
      puntos: ds.historico.map((p, i) => ({
        periodo: etiquetaPeriodo(p),
        valor: indicador.extraer(agregados[i]),
      })),
    }));

/** Variación de los indicadores indicados para una unidad (periodo actual vs comparación). */
const variacionesUnidad = (
  ds: Dataset,
  unidad: (typeof ds.unidades)[number],
  claves: string[],
): Record<string, Variacion> => {
  const actual = agregadoCerrado(ds, unidad, ds.periodo);
  const anterior = agregadoCerrado(ds, unidad, ds.comparacion);
  const resultado: Record<string, Variacion> = {};
  for (const clave of claves) {
    const indicador = INDICADORES_POR_CLAVE.get(clave)!;
    resultado[clave] = variacionPeriodo(ds, indicador.extraer(anterior), indicador.extraer(actual));
  }
  return resultado;
};

const INDICADORES_SERVICIO = SERVICIOS_VARIACION.map((s) => s.indicador);

/** Las alertas del dashboard se limitan a las Congregaciones Ciudad. */
const TIPO_UNIDAD_ALERTAS = "CONGREGACION";

const todasLasAlertas = (ds: Dataset) =>
  ordenarAlertas(
    ds.unidades
      .filter((u) => u.ref.tipo === TIPO_UNIDAD_ALERTAS)
      .flatMap((u) => ds.alertasPorUnidad.get(u.clave) ?? []),
  );

/** Estado del informe trimestral de las Congregaciones Ciudad, agrupado por país (orden alfabético). */
const construirEntregaPorPais = (ds: Dataset): EntregaPaisDTO[] => {
  const grupos = new Map<string, EntregaPaisDTO>();
  for (const unidad of unidadesInformantes(ds.unidades)) {
    const clave = String(unidad.ref.pais_id ?? "sin-pais");
    let grupo = grupos.get(clave);
    if (!grupo) {
      grupo = {
        pais_id: unidad.ref.pais_id,
        pais: unidad.ref.pais ?? "Sin país",
        total: 0,
        entregados: 0,
        enElaboracion: 0,
        pendientes: 0,
        sinObrero: 0,
        porcentajeConInforme: null,
      };
      grupos.set(clave, grupo);
    }
    grupo.total++;
    switch (estadoUnidad(ds, unidad)) {
      case "ENTREGADO":
        grupo.entregados++;
        break;
      case "EN_ELABORACION":
        grupo.enElaboracion++;
        break;
      case "PENDIENTE":
        grupo.pendientes++;
        break;
      default:
        grupo.sinObrero++;
    }
  }

  return [...grupos.values()]
    .map((g) => {
      const esperadas = g.total - g.sinObrero;
      return {
        ...g,
        porcentajeConInforme:
          esperadas > 0 && !ds.contexto.coberturaTemporal.sinCobertura &&
          !ds.contexto.integridad.informesSinAmbitoPeriodo
            ? Math.round(((g.entregados + g.enElaboracion) / esperadas) * 1000) / 10
            : null,
      };
    })
    .sort((a, b) => a.pais.localeCompare(b.pais, "es"));
};

/* ------------------------------------------------------------------ */
/* API pública del servicio                                            */
/* ------------------------------------------------------------------ */

export const obtenerFiltrosDisponibles = async (): Promise<FiltrosDisponiblesDTO> => {
  const catalogo = await obtenerCatalogo();
  const activo = periodoActivo();
  const anios: number[] = [];
  for (let anio = activo.anio; anio >= Number(DASHBOARD_SUPERVISION_CONFIG.inicioCobertura.slice(0, 4)); anio--) anios.push(anio);

  return {
    periodoActivo: periodoDTO(activo),
    anios,
    trimestres: [1, 2, 3, 4].map((t) => ({ valor: t, etiqueta: `Q${t}` })),
    comparaciones: MODOS_COMPARACION,
    paises: catalogo.listaPaises.map((p) => ({ id: p.id, nombre: p.nombre })),
    congregaciones: catalogo.listaCongregaciones.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      pais_id: c.pais_id,
    })),
    campos: catalogo.listaCampos.map((k) => ({
      id: k.id,
      nombre: k.nombre,
      congregacion_id: k.congregacion_id,
    })),
    umbrales: { ...DASHBOARD_SUPERVISION_CONFIG.umbrales },
    reglasAlertas: {
      trimestresTendencia: DASHBOARD_SUPERVISION_CONFIG.tendencia.periodosConsecutivos,
      trimestresAsuntoRecurrente: DASHBOARD_SUPERVISION_CONFIG.asuntosRecurrentes.trimestresConsecutivos,
      trimestresHistorico: DASHBOARD_SUPERVISION_CONFIG.trimestresHistorico,
    },
  };
};

export const obtenerResumen = async (filtros: FiltrosDashboard): Promise<ResumenDTO> => {
  const ds = await obtenerDataset(filtros);
  const ciudades = unidadesInformantes(ds.unidades);
  const estados = ciudades.map((u) => estadoUnidad(ds, u));
  const contar = (estado: EstadoEntrega) => estados.filter((e) => e === estado).length;
  const conObrero = ciudades.length - contar("SIN_OBRERO");
  const conInforme = contar("ENTREGADO") + contar("EN_ELABORACION");

  const total = agregadoDeInformes(ds, informesPeriodo(ds, ciudades, ds.periodo));
  const { unidadesComparadas } = conjuntosComparables(ds, ciudades);
  const alertas = todasLasAlertas(ds);

  const unSoloPais =
    filtros.pais_id !== null || filtros.congregacion_id !== null || filtros.campo_id !== null;

  return {
    contexto: ds.contexto,
    cobertura: {
      unidades: ds.unidades.length,
      porTipo: {
        PAIS: ds.unidades.filter((u) => u.ref.tipo === "PAIS").length,
        CONGREGACION: ds.unidades.filter((u) => u.ref.tipo === "CONGREGACION").length,
        CAMPO: ds.unidades.filter((u) => u.ref.tipo === "CAMPO").length,
      },
      conObrero,
      entregados: contar("ENTREGADO"),
      enElaboracion: contar("EN_ELABORACION"),
      pendientes: contar("PENDIENTE"),
      sinObrero: contar("SIN_OBRERO"),
      porcentajeConInforme:
        conObrero > 0 && !ds.contexto.coberturaTemporal.sinCobertura &&
        !ds.contexto.integridad.informesSinAmbitoPeriodo
          ? Math.round((conInforme / conObrero) * 1000) / 10 : null,
      porcentajeEntregado:
        conObrero > 0 && !ds.contexto.coberturaTemporal.sinCobertura &&
        !ds.contexto.integridad.informesSinAmbitoPeriodo
          ? Math.round((contar("ENTREGADO") / conObrero) * 1000) / 10 : null,
      informesPeriodo: total.informes,
      unidadesComparadas,
    },
    indicadores: construirIndicadores(ds, total, ciudades),
    asistenciaPorServicio: construirAsistenciaPorServicio(ds, total, ciudades),
    variacionPorServicio: (() => {
      const porUnidad = ciudades.map((u) => variacionesUnidad(ds, u, INDICADORES_SERVICIO));
      return SERVICIOS_VARIACION.map((s) => ({
        clave: s.clave,
        etiqueta: s.etiqueta,
        indicador: s.indicador,
        conteo: contarPorGrupo(porUnidad.map((v) => v[s.indicador])),
      }));
    })(),
    entregaPorPais: construirEntregaPorPais(ds),
    actividadesEspiritualesPorCategoria: ds.categoriasEspirituales.map((cat) => {
      const leer = (ag: AgregadoMetricas) =>
        ag.informes > 0 && ag.valores["esp.total"] !== undefined ? ag.valores[`esp.cat.${cat.id}`] ?? 0 : null;
      const { actual, anterior } = conjuntosComparables(ds, ciudades, leer);
      return {
        id: cat.id,
        nombre: cat.nombre,
        valorPeriodo: leer(total),
        variacion: variacionPeriodo(ds, leer(anterior), leer(actual)),
      };
    }),
    actividadEconomica: unSoloPais
      ? {
          disponible: true,
          montoRecaudado: total.informes > 0 ? total.valores["eco.monto"] ?? null : null,
          mensaje: "Monto expresado en la moneda local del país seleccionado.",
        }
      : {
          disponible: false,
          montoRecaudado: null,
          mensaje:
            "Seleccione un país para ver montos: cada país registra en su moneda local y no se suman entre sí.",
        },
    alertas: { total: alertas.length, porTipo: contarPorTipo(alertas) },
  };
};

export const obtenerTendencias = async (filtros: FiltrosDashboard): Promise<TendenciasDTO> => {
  const ds = await obtenerDataset(filtros);
  const ciudades = unidadesInformantes(ds.unidades);
  const agregados = ds.historico.map((p) =>
    agregadoDeInformes(ds, informesPeriodo(ds, ciudades, p)),
  );
  const ids = new Set(ds.historico.flatMap((p) => informesPeriodo(ds, ciudades, p)).map((i) => i.id));
  const porMes = new Map<string, { cantidad: number; asistencia: number }>();
  for (const actividad of ds.actividades) {
    if (!ids.has(actividad.informe_id) ||
      !CATEGORIAS_SERVICIO.includes(clasificarActividad(actividad.nombre, actividad.diaSemana))) continue;
    const total = porMes.get(actividad.mes) ?? { cantidad: 0, asistencia: 0 };
    total.cantidad += actividad.cantidad;
    total.asistencia += actividad.asistencia;
    porMes.set(actividad.mes, total);
  }
  const meses: string[] = [];
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(0, 7);
  const fin = fechaFinExclusivaPeriodo(ds.periodo).slice(0, 7);
  const inicioHistorico = fechaInicioPeriodo(ds.historico[0] ?? ds.periodo);
  const inicio = inicioHistorico < DASHBOARD_SUPERVISION_CONFIG.inicioCobertura
    ? DASHBOARD_SUPERVISION_CONFIG.inicioCobertura : inicioHistorico;
  for (let fecha = inicio; fecha.slice(0, 7) < fin && fecha.slice(0, 7) <= hoy;) {
    meses.push(fecha.slice(0, 7));
    const siguiente = new Date(`${fecha}T12:00:00Z`);
    siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);
    fecha = siguiente.toISOString().slice(0, 10);
  }

  return {
    contexto: ds.contexto,
    periodos: ds.historico.map(periodoDTO),
    informesPorPeriodo: ds.historico.map((p, i) => ({
      periodo: etiquetaPeriodo(p),
      valor: agregados[i].informes,
    })),
    series: construirSeries(ds, agregados),
    seriesMensuales: [
      { clave: "asistenciaMensual", etiqueta: "Asistencia acumulada a servicios (no personas únicas)", formato: "ENTERO",
        puntos: meses.map((mes) => ({ periodo: mes, valor: porMes.get(mes)?.asistencia ?? null })) },
      { clave: "serviciosMensuales", etiqueta: "Servicios registrados por mes", formato: "ENTERO",
        puntos: meses.map((mes) => ({ periodo: mes, valor: porMes.get(mes)?.cantidad ?? null })) },
      { clave: "promedioMensual", etiqueta: "Promedio de asistencia por servicio", formato: "DECIMAL",
        puntos: meses.map((mes) => ({ periodo: mes, valor: porMes.has(mes)
          ? calcularPromedio(porMes.get(mes)!.asistencia, porMes.get(mes)!.cantidad) : null })) },
    ],
  };
};

export const obtenerAlertas = async (
  filtros: FiltrosDashboard,
  opciones: { tipo?: string; nivel?: string } = {},
): Promise<AlertasDTO> => {
  const ds = await obtenerDataset(filtros);
  const todas = todasLasAlertas(ds);
  const alertas = todas.filter(
    (a) => (!opciones.tipo || a.tipo === opciones.tipo) && (!opciones.nivel || a.nivel === opciones.nivel),
  );
  return { contexto: ds.contexto, total: alertas.length, porTipo: contarPorTipo(todas), alertas };
};

const INDICADORES_TABLA = [
  "asistenciaGeneral",
  "visitasTotales",
  "actividadesEspirituales",
  ...INDICADORES_SERVICIO,
];

const ORDENES: OrdenUnidades[] = [
  "NOMBRE",
  "PAIS",
  "CONGREGACION",
  "MAYOR_INCREMENTO",
  "MAYOR_DISMINUCION",
  "MAS_ALERTAS",
];

export interface OpcionesUnidades {
  busqueda?: string;
  tipo?: string;
  estado?: string;
  orden?: string;
  /** Clave de servicio (general, martes, jueves, domingo, otros). */
  servicio?: string;
  /** Grupo de variación (tendencia, DISMINUYO, AUMENTO o SIN_COMPARACION). Requiere `servicio`. */
  variacion?: string;
  pagina?: number;
  porPagina?: number;
}

export const obtenerUnidades = async (
  filtros: FiltrosDashboard,
  opciones: OpcionesUnidades = {},
): Promise<UnidadesDTO> => {
  const ds = await obtenerDataset(filtros);
  const busqueda = normalizarTexto(opciones.busqueda);
  const servicio = servicioVariacion(opciones.servicio);
  const grupos = servicio ? gruposDeFiltro(opciones.variacion) : null;
  const indicadorOrden = servicio?.indicador ?? "asistenciaGeneral";

  let filas: UnidadFilaDTO[] = ds.unidades.map((unidad) => ({
    unidad: unidad.ref,
    obreros: nombreObreros(unidad, ds.usuarios),
    estadoEntrega: estadoUnidad(ds, unidad),
    informes: agregadoUnidad(ds, unidad, ds.periodo).informes,
    indicadores: variacionesUnidad(ds, unidad, INDICADORES_TABLA),
    alertas: ds.alertasPorUnidad.get(unidad.clave)?.length ?? 0,
  }));

  filas = filas.filter(
    (f) =>
      (!opciones.tipo || f.unidad.tipo === opciones.tipo) &&
      (!opciones.estado || f.estadoEntrega === opciones.estado) &&
      (!grupos || grupos.includes(grupoDeVariacion(f.indicadores[servicio!.indicador]))) &&
      (!busqueda ||
        normalizarTexto(
          [f.unidad.nombre, f.unidad.pais, f.unidad.congregacion, ...f.obreros].join(" "),
        ).includes(busqueda)),
  );

  const orden: OrdenUnidades = ORDENES.includes(opciones.orden as OrdenUnidades)
    ? (opciones.orden as OrdenUnidades)
    : "NOMBRE";
  const texto = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "", "es");
  const porcentaje = (f: UnidadFilaDTO) => f.indicadores[indicadorOrden]?.porcentaje ?? null;
  const porNombre = (a: UnidadFilaDTO, b: UnidadFilaDTO) => texto(a.unidad.nombre, b.unidad.nombre);

  filas.sort((a, b) => {
    switch (orden) {
      case "PAIS":
        return texto(a.unidad.pais, b.unidad.pais) || porNombre(a, b);
      case "CONGREGACION":
        return texto(a.unidad.congregacion, b.unidad.congregacion) || a.unidad.tipo.localeCompare(b.unidad.tipo) || porNombre(a, b);
      case "MAYOR_INCREMENTO":
      case "MAYOR_DISMINUCION": {
        const pa = porcentaje(a);
        const pb = porcentaje(b);
        if (pa === null && pb === null) return porNombre(a, b);
        if (pa === null) return 1;
        if (pb === null) return -1;
        return (orden === "MAYOR_INCREMENTO" ? pb - pa : pa - pb) || porNombre(a, b);
      }
      case "MAS_ALERTAS":
        return b.alertas - a.alertas || porNombre(a, b);
      default:
        return porNombre(a, b);
    }
  });

  const { porPaginaDefecto, porPaginaMaximo } = DASHBOARD_SUPERVISION_CONFIG.paginacion;
  const porPagina = Math.min(
    Math.max(1, Math.floor(opciones.porPagina || porPaginaDefecto)),
    porPaginaMaximo,
  );
  const totalPaginas = Math.max(1, Math.ceil(filas.length / porPagina));
  const pagina = Math.min(Math.max(1, Math.floor(opciones.pagina || 1)), totalPaginas);

  return {
    contexto: ds.contexto,
    pagina,
    porPagina,
    total: filas.length,
    totalPaginas,
    unidades: filas.slice((pagina - 1) * porPagina, pagina * porPagina),
  };
};

export const obtenerDetalleUnidad = async (
  filtros: FiltrosDashboard,
  tipo: string,
  id: number,
): Promise<DetalleUnidadDTO> => {
  if (tipo !== "PAIS" && tipo !== "CONGREGACION" && tipo !== "CAMPO") {
    throw new ErrorDashboard("El tipo debe ser PAIS, CONGREGACION o CAMPO.");
  }
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorDashboard("El identificador de la unidad no es válido.");
  }

  const catalogo = await obtenerCatalogo();
  const existe =
    tipo === "CAMPO"
      ? catalogo.campos.has(id)
      : tipo === "PAIS"
        ? catalogo.paises.has(id)
        : catalogo.congregaciones.has(id);
  if (!existe) throw new ErrorDashboard("La congregación solicitada no existe o está inactiva.", 404);

  const alcance: FiltrosDashboard = {
    ...filtros,
    pais_id: tipo === "PAIS" ? id : null,
    congregacion_id: tipo === "CONGREGACION" ? id : null,
    campo_id: tipo === "CAMPO" ? id : null,
  };
  const ds = await obtenerDataset(alcance);
  const unidad = ds.unidades.find((u) => u.clave === `${tipo as TipoUnidad}-${id}`);
  if (!unidad) throw new ErrorDashboard("La unidad solicitada no existe o está inactiva.", 404);

  const ciudades = tipo === "CONGREGACION" ? [unidad] : ciudadesDelDetalle(ds.unidades, tipo, id);
  const informesDeCiudades = (periodo: Periodo) => {
    const informes = new Map<number, consultas.FilaInforme>();
    for (const ciudad of ciudades) {
      for (const informe of informesDe(ds, ciudad, periodo)) informes.set(informe.id, informe);
    }
    return [...informes.values()];
  };
  const total = agregadoDeInformes(ds, informesDeCiudades(ds.periodo));
  const informesActuales = informesDeCiudades(ds.periodo);
  const idsActuales = [...new Set(informesActuales.map((i) => i.id))];

  const [logros, metas] = await Promise.all([
    consultas.obtenerLogros(idsActuales),
    consultas.obtenerMetas(idsActuales),
  ]);

  const alertas = ordenarAlertas(
    ciudades.flatMap((ciudad) => ds.alertasPorUnidad.get(ciudad.clave) ?? []),
  );
  const recurrentes = new Set(
    alertas
      .filter((a) => a.tipo === "ASUNTO_RECURRENTE" && a.detalle.asunto)
      .map((a) => normalizarTexto(a.detalle.asunto)),
  );

  const informesHistorico = ds.historico
    .flatMap((p) => informesDeCiudades(p))
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || b.id - a.id);
  const estados = ciudades.map((ciudad) => estadoUnidad(ds, ciudad));
  const contarEstado = (estado: EstadoEntrega) => estados.filter((valor) => valor === estado).length;
  const entregaAgregada =
    tipo === "CONGREGACION"
      ? undefined
      : {
          ciudades: ciudades.length,
          entregados: contarEstado("ENTREGADO"),
          enElaboracion: contarEstado("EN_ELABORACION"),
          pendientes: contarEstado("PENDIENTE"),
          sinObrero: contarEstado("SIN_OBRERO"),
        };

  return {
    contexto: ds.contexto,
    unidad: unidad.ref,
    obreros: [...new Set(ciudades.flatMap((ciudad) => ciudad.obreros))].map((idObrero) => ({
      id: idObrero,
      nombre: ds.usuarios.get(idObrero)?.nombre || `Usuario ${idObrero}`,
      email: ds.usuarios.get(idObrero)?.email ?? null,
    })),
    estadoEntrega: entregaAgregada ? null : estadoUnidad(ds, unidad),
    entregaAgregada,
    informes: informesHistorico.map((i) => ({
      id: i.id,
      periodo: etiquetaPeriodo(periodoDesdeFecha(i.periodo) as Periodo),
      estado: i.estado,
      obrero: ds.usuarios.get(i.usuario_id)?.nombre || `Usuario ${i.usuario_id}`,
      creado: i.createdAt,
    })),
    indicadores: construirIndicadores(ds, total, ciudades),
    asistenciaPorServicio: construirAsistenciaPorServicio(ds, total, ciudades),
    historico: {
      periodos: ds.historico.map(periodoDTO),
      series: construirSeries(
        ds,
        ds.historico.map((p) => agregadoDeInformes(ds, informesDeCiudades(p))),
      ),
    },
    logros,
    metas,
    asuntosPendientes: idsActuales
      .flatMap((idInforme) => ds.asuntos.get(idInforme) ?? [])
      .map((a) => ({
        asunto: a.asunto,
        tipoAsunto: a.tipoAsunto,
        responsable: a.responsable,
        recurrente: recurrentes.has(normalizarTexto(a.asunto)),
      })),
    alertas,
  };
};

/** Vacía la caché (útil tras cambios masivos de datos). */
export const limpiarCacheDashboard = () => cache.clear();
