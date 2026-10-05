import {
  CATEGORIAS_SERVICIO,
  CategoriaActividad,
} from "./clasificacion";
import { calcularPromedio } from "./variacion";

/**
 * Valores numéricos de un informe (o de la suma de varios informes).
 * Las claves se agrupan por prefijo:
 *  - `act.*`  actividades eclesiásticas (`act.<CATEGORIA>.cantidad|asistencia`, `act.registros`)
 *  - `vis.*`  visitas (`vis.hogares|hospital|remotas|referidas|registros`)
 *  - `sit.*`  situaciones de visita (`sit.total|seguimiento`)
 *  - `esp.*`  actividades espirituales (`esp.total`, `esp.cat.<id>`)
 *  - `eco.*`  actividades económicas (`eco.cantidad|asistencia|monto`)
 *  - `logros`, `metas`, `asuntos`, `asuntos.<TIPO>`
 */
export type ValoresMetricas = Record<string, number>;

/** Secciones con semántica "sin registros = sin información" (no se interpretan como 0). */
export type SeccionOpcional = "act" | "vis";

export interface AgregadoMetricas {
  informes: number;
  valores: ValoresMetricas;
  /** Cantidad de informes que aportaron datos a cada sección opcional. */
  secciones: Record<SeccionOpcional, number>;
}

export const crearAgregado = (): AgregadoMetricas => ({
  informes: 0,
  valores: {},
  secciones: { act: 0, vis: 0 },
});

export const sumarValor = (valores: ValoresMetricas, clave: string, valor: number) => {
  if (!Number.isFinite(valor)) return;
  valores[clave] = (valores[clave] ?? 0) + valor;
};

export const acumular = (destino: AgregadoMetricas, origen: AgregadoMetricas) => {
  destino.informes += origen.informes;
  destino.secciones.act += origen.secciones.act;
  destino.secciones.vis += origen.secciones.vis;
  for (const [clave, valor] of Object.entries(origen.valores)) {
    sumarValor(destino.valores, clave, valor);
  }
};

export const agregarInformes = (
  informes: Iterable<AgregadoMetricas | undefined>,
): AgregadoMetricas => {
  const total = crearAgregado();
  for (const informe of informes) {
    if (informe) acumular(total, informe);
  }
  return total;
};

const valor = (ag: AgregadoMetricas, clave: string) => ag.valores[clave] ?? 0;

/** Devuelve null si no hay informes, o si la sección opcional no tiene registros. */
const siHay = (
  ag: AgregadoMetricas,
  seccion: SeccionOpcional | null,
  calculo: () => number | null,
): number | null => {
  if (ag.informes <= 0) return null;
  if (seccion && ag.secciones[seccion] <= 0) return null;
  return calculo();
};

const sumaServicios = (ag: AgregadoMetricas, campo: "cantidad" | "asistencia") =>
  CATEGORIAS_SERVICIO.reduce((total, cat) => total + valor(ag, `act.${cat}.${campo}`), 0);

export type GrupoIndicador =
  | "ASISTENCIA"
  | "VIDA_ESPIRITUAL"
  | "TRABAJO_PASTORAL"
  | "ADMINISTRACION";

export interface DefinicionIndicador {
  clave: string;
  etiqueta: string;
  grupo: GrupoIndicador;
  /** `true` si la métrica se usa para alertas de disminución/incremento/tendencia. */
  alertable: boolean;
  formato: "ENTERO" | "DECIMAL";
  extraer: (ag: AgregadoMetricas) => number | null;
}

const promedioCategoria = (cat: CategoriaActividad) => (ag: AgregadoMetricas) =>
  siHay(ag, "act", () =>
    calcularPromedio(valor(ag, `act.${cat}.asistencia`), valor(ag, `act.${cat}.cantidad`)),
  );

export const INDICADORES: DefinicionIndicador[] = [
  {
    clave: "asistenciaGeneral",
    etiqueta: "Asistencia general a servicios",
    grupo: "ASISTENCIA",
    alertable: true,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "act", () => sumaServicios(ag, "asistencia")),
  },
  {
    clave: "serviciosRealizados",
    etiqueta: "Servicios realizados",
    grupo: "ASISTENCIA",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "act", () => sumaServicios(ag, "cantidad")),
  },
  {
    clave: "promedioAsistenciaServicio",
    etiqueta: "Promedio de asistencia por servicio",
    grupo: "ASISTENCIA",
    alertable: true,
    formato: "DECIMAL",
    extraer: (ag) =>
      siHay(ag, "act", () =>
        calcularPromedio(sumaServicios(ag, "asistencia"), sumaServicios(ag, "cantidad")),
      ),
  },
  {
    clave: "promedioServicioMartes",
    etiqueta: "Promedio servicio martes",
    grupo: "ASISTENCIA",
    alertable: true,
    formato: "DECIMAL",
    extraer: promedioCategoria("SERVICIO_MARTES"),
  },
  {
    clave: "promedioServicioJueves",
    etiqueta: "Promedio servicio jueves",
    grupo: "ASISTENCIA",
    alertable: true,
    formato: "DECIMAL",
    extraer: promedioCategoria("SERVICIO_JUEVES"),
  },
  {
    clave: "promedioServicioDomingo",
    etiqueta: "Promedio servicio domingo",
    grupo: "ASISTENCIA",
    alertable: true,
    formato: "DECIMAL",
    extraer: promedioCategoria("SERVICIO_DOMINGO"),
  },
  {
    clave: "promedioServicioOtrosDias",
    etiqueta: "Promedio servicios otros días",
    grupo: "ASISTENCIA",
    alertable: false,
    formato: "DECIMAL",
    extraer: promedioCategoria("SERVICIO_OTROS_DIAS"),
  },
  {
    clave: "consejeros",
    etiqueta: "Consejeros realizados",
    grupo: "VIDA_ESPIRITUAL",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "act", () => valor(ag, "act.CONSEJERO.cantidad")),
  },
  {
    clave: "asistenciaConsejeros",
    etiqueta: "Asistencia a consejeros",
    grupo: "VIDA_ESPIRITUAL",
    alertable: true,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "act", () => valor(ag, "act.CONSEJERO.asistencia")),
  },
  {
    clave: "vigilias",
    etiqueta: "Vigilias realizadas",
    grupo: "VIDA_ESPIRITUAL",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "act", () => valor(ag, "act.VIGILIA.cantidad")),
  },
  {
    clave: "participacionVigilias",
    etiqueta: "Participación en vigilias",
    grupo: "VIDA_ESPIRITUAL",
    alertable: true,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "act", () => valor(ag, "act.VIGILIA.asistencia")),
  },
  {
    clave: "actividadesEspirituales",
    etiqueta: "Actividades espirituales",
    grupo: "VIDA_ESPIRITUAL",
    alertable: true,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "esp.total")),
  },
  {
    clave: "visitasHogares",
    etiqueta: "Visitas a hogares",
    grupo: "TRABAJO_PASTORAL",
    alertable: true,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "vis", () => valor(ag, "vis.hogares")),
  },
  {
    clave: "visitasHospital",
    etiqueta: "Visitas a hospitales",
    grupo: "TRABAJO_PASTORAL",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "vis", () => valor(ag, "vis.hospital")),
  },
  {
    clave: "visitasRemotas",
    etiqueta: "Visitas remotas",
    grupo: "TRABAJO_PASTORAL",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "vis", () => valor(ag, "vis.remotas")),
  },
  {
    clave: "visitasTotales",
    etiqueta: "Visitas pastorales totales",
    grupo: "TRABAJO_PASTORAL",
    alertable: true,
    formato: "ENTERO",
    extraer: (ag) =>
      siHay(
        ag,
        "vis",
        () => valor(ag, "vis.hogares") + valor(ag, "vis.hospital") + valor(ag, "vis.remotas"),
      ),
  },
  {
    clave: "referidasOots",
    etiqueta: "Referidas a OOTS",
    grupo: "TRABAJO_PASTORAL",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, "vis", () => valor(ag, "vis.referidas")),
  },
  {
    clave: "situacionesAtendidas",
    etiqueta: "Situaciones atendidas",
    grupo: "TRABAJO_PASTORAL",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "sit.total")),
  },
  {
    clave: "situacionesEnSeguimiento",
    etiqueta: "Situaciones en seguimiento",
    grupo: "TRABAJO_PASTORAL",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "sit.seguimiento")),
  },
  {
    clave: "actividadesEconomicas",
    etiqueta: "Actividades económicas",
    grupo: "ADMINISTRACION",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "eco.cantidad")),
  },
  {
    clave: "asistenciaActividadesEconomicas",
    etiqueta: "Asistencia a actividades económicas",
    grupo: "ADMINISTRACION",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "eco.asistencia")),
  },
  {
    clave: "logros",
    etiqueta: "Logros registrados",
    grupo: "ADMINISTRACION",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "logros")),
  },
  {
    clave: "metas",
    etiqueta: "Metas registradas",
    grupo: "ADMINISTRACION",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "metas")),
  },
  {
    clave: "asuntosPendientes",
    etiqueta: "Asuntos pendientes",
    grupo: "ADMINISTRACION",
    alertable: false,
    formato: "ENTERO",
    extraer: (ag) => siHay(ag, null, () => valor(ag, "asuntos")),
  },
];

export const INDICADORES_POR_CLAVE = new Map(INDICADORES.map((i) => [i.clave, i]));

/** Indicadores que alimentan las gráficas de tendencias. */
export const INDICADORES_TENDENCIA = [
  "asistenciaGeneral",
  "promedioAsistenciaServicio",
  "promedioServicioMartes",
  "promedioServicioJueves",
  "promedioServicioDomingo",
  "asistenciaConsejeros",
  "participacionVigilias",
  "actividadesEspirituales",
  "visitasTotales",
  "situacionesAtendidas",
];
