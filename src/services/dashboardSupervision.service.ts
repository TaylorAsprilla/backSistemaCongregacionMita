import { DASHBOARD_SUPERVISION_CONFIG } from "../config/dashboardSupervision.config";
import { obtenerPeriodoInformeActivo } from "../helpers/periodoInforme";
import {
  AlertaDTO,
  AlertasDTO,
  AsistenciaServicioDTO,
  ContextoDashboard,
  DetalleUnidadDTO,
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
  listaPaises: consultas.FilaPais[];
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

  if (filtros.campo_id !== null) {
    const campo = catalogo.listaCampos.find((k) => k.id === filtros.campo_id);
    return campo ? [campoRef(campo)] : [];
  }

  const congregaciones = catalogo.listaCongregaciones.filter(
    (c) =>
      (filtros.congregacion_id === null || c.id === filtros.congregacion_id) &&
      (filtros.pais_id === null || c.pais_id === filtros.pais_id),
  );
  const idsCongregacion = new Set(congregaciones.map((c) => c.id));
  const campos = catalogo.listaCampos.filter(
    (k) => k.congregacion_id !== null && idsCongregacion.has(k.congregacion_id),
  );

  return [...congregaciones.map(congregacionRef), ...campos.map(campoRef)];
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

  return { metricas, asuntos: asuntosPorInforme };
};

const informesDe = (ds: Dataset, unidad: Unidad, periodo: Periodo) =>
  ds.informesPorUnidad.get(unidad.clave)?.get(clavePeriodo(periodo)) ?? [];

/** Suma los informes indicados sin duplicar (un informe puede cubrir varias unidades). */
const agregadoDeInformes = (ds: Dataset, informes: Iterable<consultas.FilaInforme>) => {
  const ids = new Set<number>();
  for (const informe of informes) ids.add(informe.id);
  return agregarInformes([...ids].map((id) => ds.metricas.get(id)));
};

const agregadoUnidad = (ds: Dataset, unidad: Unidad, periodo: Periodo) =>
  agregadoDeInformes(ds, informesDe(ds, unidad, periodo));

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
  const etiqueta = etiquetaPeriodo(ds.periodo);
  const etiquetaComparacion = etiquetaPeriodo(ds.comparacion);
  const alertas: AlertaDTO[] = [];

  if (estadoUnidad(ds, unidad) === "PENDIENTE") {
    alertas.push(alertaInformePendiente(unidad.ref, etiqueta));
  }

  alertas.push(
    ...alertasVariacion(
      unidad.ref,
      agregadoUnidad(ds, unidad, ds.periodo),
      agregadoUnidad(ds, unidad, ds.comparacion),
      etiqueta,
      etiquetaComparacion,
    ),
  );

  alertas.push(
    ...alertasTendencia(
      unidad.ref,
      ds.historico.map((p) => agregadoUnidad(ds, unidad, p)),
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
  const historico = periodosHistorico(periodo, DASHBOARD_SUPERVISION_CONFIG.trimestresHistorico);
  const inicio = [historico[0], comparacion].sort(compararPeriodos)[0];

  const unidades = unidadesEnAlcance(filtros, catalogo);
  const idsObreros = [...new Set(unidades.flatMap((u) => u.obreros))];

  const [informes, usuarios] = await Promise.all([
    consultas.obtenerInformes(idsObreros, fechaInicioPeriodo(inicio), fechaFinExclusivaPeriodo(periodo)),
    consultas.obtenerUsuarios(idsObreros),
  ]);

  const informesPorUsuario = new Map<number, consultas.FilaInforme[]>();
  for (const informe of informes) {
    const lista = informesPorUsuario.get(informe.usuario_id) ?? [];
    lista.push(informe);
    informesPorUsuario.set(informe.usuario_id, lista);
  }

  const informesPorUnidad = new Map<string, Map<string, consultas.FilaInforme[]>>();
  for (const unidad of unidades) {
    const porPeriodo = new Map<string, consultas.FilaInforme[]>();
    for (const obrero of unidad.obreros) {
      for (const informe of informesPorUsuario.get(obrero) ?? []) {
        const p = periodoDesdeFecha(informe.periodo);
        if (!p) continue;
        const clave = clavePeriodo(p);
        porPeriodo.set(clave, [...(porPeriodo.get(clave) ?? []), informe]);
      }
    }
    informesPorUnidad.set(unidad.clave, porPeriodo);
  }

  const { metricas, asuntos } = await construirMetricas(informes.map((i) => i.id));

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
    contexto: {
      filtros,
      periodo: periodoDTO(periodo),
      periodoComparacion: periodoDTO(comparacion),
      descripcionComparacion: descripcionComparacion(filtros.comparacion, comparacion),
      generadoEn: new Date().toISOString(),
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

/* ------------------------------------------------------------------ */
/* Cálculos compartidos                                                */
/* ------------------------------------------------------------------ */

/** Informes del periodo y de comparación de las unidades que tienen informe en ambos. */
const conjuntosComparables = (ds: Dataset, unidades: Unidad[]) => {
  const actuales: consultas.FilaInforme[] = [];
  const anteriores: consultas.FilaInforme[] = [];
  let unidadesComparadas = 0;

  for (const unidad of unidades) {
    const actual = informesDe(ds, unidad, ds.periodo);
    const anterior = informesDe(ds, unidad, ds.comparacion);
    if (actual.length && anterior.length) {
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
  total: AgregadoMetricas,
  actual: AgregadoMetricas,
  anterior: AgregadoMetricas,
): IndicadorDTO[] =>
  INDICADORES.map((indicador) => ({
    clave: indicador.clave,
    etiqueta: indicador.etiqueta,
    grupo: indicador.grupo,
    formato: indicador.formato,
    valorPeriodo: indicador.extraer(total),
    variacion: calcularVariacion(indicador.extraer(anterior), indicador.extraer(actual)),
  }));

const CATEGORIAS_ASISTENCIA: CategoriaActividad[] = [...CATEGORIAS_SERVICIO, "CONSEJERO", "VIGILIA"];

const construirAsistenciaPorServicio = (
  total: AgregadoMetricas,
  actual: AgregadoMetricas,
  anterior: AgregadoMetricas,
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
    return {
      categoria,
      etiqueta: ETIQUETAS_CATEGORIA_ACTIVIDAD[categoria],
      ...periodo,
      variacionPromedio: calcularVariacion(
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

const todasLasAlertas = (ds: Dataset) =>
  ordenarAlertas(ds.unidades.flatMap((u) => ds.alertasPorUnidad.get(u.clave) ?? []));

/* ------------------------------------------------------------------ */
/* API pública del servicio                                            */
/* ------------------------------------------------------------------ */

export const obtenerFiltrosDisponibles = async (): Promise<FiltrosDisponiblesDTO> => {
  const catalogo = await obtenerCatalogo();
  const activo = periodoActivo();
  const anios: number[] = [];
  for (let anio = activo.anio; anio >= Math.max(2020, activo.anio - 6); anio--) anios.push(anio);

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
  };
};

export const obtenerResumen = async (filtros: FiltrosDashboard): Promise<ResumenDTO> => {
  const ds = await obtenerDataset(filtros);
  const estados = ds.unidades.map((u) => estadoUnidad(ds, u));
  const contar = (estado: EstadoEntrega) => estados.filter((e) => e === estado).length;
  const conObrero = ds.unidades.length - contar("SIN_OBRERO");
  const conInforme = contar("ENTREGADO") + contar("EN_ELABORACION");

  const total = agregadoDeInformes(ds, informesPeriodo(ds, ds.unidades, ds.periodo));
  const { actual, anterior, unidadesComparadas } = conjuntosComparables(ds, ds.unidades);
  const alertas = todasLasAlertas(ds);

  const unSoloPais =
    filtros.pais_id !== null || filtros.congregacion_id !== null || filtros.campo_id !== null;

  return {
    contexto: ds.contexto,
    cobertura: {
      unidades: ds.unidades.length,
      conObrero,
      entregados: contar("ENTREGADO"),
      enElaboracion: contar("EN_ELABORACION"),
      pendientes: contar("PENDIENTE"),
      sinObrero: contar("SIN_OBRERO"),
      porcentajeConInforme:
        conObrero > 0 ? Math.round((conInforme / conObrero) * 1000) / 10 : null,
      informesPeriodo: total.informes,
      unidadesComparadas,
    },
    indicadores: construirIndicadores(total, actual, anterior),
    asistenciaPorServicio: construirAsistenciaPorServicio(total, actual, anterior),
    actividadesEspiritualesPorCategoria: ds.categoriasEspirituales.map((cat) => {
      const leer = (ag: AgregadoMetricas) =>
        ag.informes > 0 ? ag.valores[`esp.cat.${cat.id}`] ?? 0 : null;
      return {
        id: cat.id,
        nombre: cat.nombre,
        valorPeriodo: leer(total),
        variacion: calcularVariacion(leer(anterior), leer(actual)),
      };
    }),
    actividadEconomica: unSoloPais
      ? {
          disponible: true,
          montoRecaudado: total.informes > 0 ? total.valores["eco.monto"] ?? 0 : null,
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
  const agregados = ds.historico.map((p) =>
    agregadoDeInformes(ds, informesPeriodo(ds, ds.unidades, p)),
  );

  return {
    contexto: ds.contexto,
    periodos: ds.historico.map(periodoDTO),
    informesPorPeriodo: ds.historico.map((p, i) => ({
      periodo: etiquetaPeriodo(p),
      valor: agregados[i].informes,
    })),
    series: construirSeries(ds, agregados),
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
  "promedioAsistenciaServicio",
  "visitasTotales",
  "actividadesEspirituales",
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
  pagina?: number;
  porPagina?: number;
}

export const obtenerUnidades = async (
  filtros: FiltrosDashboard,
  opciones: OpcionesUnidades = {},
): Promise<UnidadesDTO> => {
  const ds = await obtenerDataset(filtros);
  const busqueda = normalizarTexto(opciones.busqueda);

  let filas: UnidadFilaDTO[] = ds.unidades.map((unidad) => {
    const actual = agregadoUnidad(ds, unidad, ds.periodo);
    const anterior = agregadoUnidad(ds, unidad, ds.comparacion);
    const indicadores: Record<string, Variacion> = {};
    for (const clave of INDICADORES_TABLA) {
      const indicador = INDICADORES_POR_CLAVE.get(clave)!;
      indicadores[clave] = calcularVariacion(indicador.extraer(anterior), indicador.extraer(actual));
    }
    return {
      unidad: unidad.ref,
      obreros: nombreObreros(unidad, ds.usuarios),
      estadoEntrega: estadoUnidad(ds, unidad),
      informes: actual.informes,
      indicadores,
      alertas: ds.alertasPorUnidad.get(unidad.clave)?.length ?? 0,
    };
  });

  filas = filas.filter(
    (f) =>
      (!opciones.tipo || f.unidad.tipo === opciones.tipo) &&
      (!opciones.estado || f.estadoEntrega === opciones.estado) &&
      (!busqueda ||
        normalizarTexto(
          [f.unidad.nombre, f.unidad.pais, f.unidad.congregacion, ...f.obreros].join(" "),
        ).includes(busqueda)),
  );

  const orden: OrdenUnidades = ORDENES.includes(opciones.orden as OrdenUnidades)
    ? (opciones.orden as OrdenUnidades)
    : "NOMBRE";
  const texto = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "", "es");
  const porcentaje = (f: UnidadFilaDTO) => f.indicadores.asistenciaGeneral?.porcentaje ?? null;
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
  if (tipo !== "CONGREGACION" && tipo !== "CAMPO") {
    throw new ErrorDashboard("El tipo de unidad debe ser CONGREGACION o CAMPO.");
  }
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorDashboard("El identificador de la unidad no es válido.");
  }

  const catalogo = await obtenerCatalogo();
  const existe = tipo === "CAMPO" ? catalogo.campos.has(id) : catalogo.congregaciones.has(id);
  if (!existe) throw new ErrorDashboard("La unidad solicitada no existe o está inactiva.", 404);

  const alcance: FiltrosDashboard = {
    ...filtros,
    pais_id: null,
    congregacion_id: tipo === "CONGREGACION" ? id : null,
    campo_id: tipo === "CAMPO" ? id : null,
  };
  const ds = await obtenerDataset(alcance);
  const unidad = ds.unidades.find((u) => u.clave === `${tipo as TipoUnidad}-${id}`);
  if (!unidad) throw new ErrorDashboard("La unidad solicitada no existe o está inactiva.", 404);

  const total = agregadoUnidad(ds, unidad, ds.periodo);
  const anterior = agregadoUnidad(ds, unidad, ds.comparacion);
  const informesActuales = informesDe(ds, unidad, ds.periodo);
  const idsActuales = [...new Set(informesActuales.map((i) => i.id))];

  const [logros, metas] = await Promise.all([
    consultas.obtenerLogros(idsActuales),
    consultas.obtenerMetas(idsActuales),
  ]);

  const alertas = ordenarAlertas(ds.alertasPorUnidad.get(unidad.clave) ?? []);
  const recurrentes = new Set(
    alertas
      .filter((a) => a.tipo === "ASUNTO_RECURRENTE" && a.detalle.asunto)
      .map((a) => normalizarTexto(a.detalle.asunto)),
  );

  const informesHistorico = ds.historico
    .flatMap((p) => informesDe(ds, unidad, p))
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || b.id - a.id);

  return {
    contexto: ds.contexto,
    unidad: unidad.ref,
    obreros: unidad.obreros.map((idObrero) => ({
      id: idObrero,
      nombre: ds.usuarios.get(idObrero)?.nombre || `Usuario ${idObrero}`,
      email: ds.usuarios.get(idObrero)?.email ?? null,
    })),
    estadoEntrega: estadoUnidad(ds, unidad),
    informes: informesHistorico.map((i) => ({
      id: i.id,
      periodo: etiquetaPeriodo(periodoDesdeFecha(i.periodo) as Periodo),
      estado: i.estado,
      obrero: ds.usuarios.get(i.usuario_id)?.nombre || `Usuario ${i.usuario_id}`,
      creado: i.createdAt,
    })),
    indicadores: construirIndicadores(total, total, anterior),
    asistenciaPorServicio: construirAsistenciaPorServicio(total, total, anterior),
    historico: {
      periodos: ds.historico.map(periodoDTO),
      series: construirSeries(
        ds,
        ds.historico.map((p) => agregadoUnidad(ds, unidad, p)),
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
