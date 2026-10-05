export interface Periodo {
  anio: number;
  trimestre: number;
}

export type ModoComparacion =
  | "TRIMESTRE_ANTERIOR"
  | "MISMO_TRIMESTRE_ANIO_ANTERIOR";

export const MODOS_COMPARACION: { valor: ModoComparacion; etiqueta: string }[] = [
  { valor: "TRIMESTRE_ANTERIOR", etiqueta: "Trimestre anterior" },
  {
    valor: "MISMO_TRIMESTRE_ANIO_ANTERIOR",
    etiqueta: "Mismo trimestre del año anterior",
  },
];

const ORDINALES_TRIMESTRE = ["primer", "segundo", "tercer", "cuarto"];

export const esModoComparacion = (valor: unknown): valor is ModoComparacion =>
  MODOS_COMPARACION.some((modo) => modo.valor === valor);

export const esPeriodoValido = (anio: number, trimestre: number): boolean =>
  Number.isInteger(anio) &&
  anio >= 2000 &&
  anio <= 2100 &&
  Number.isInteger(trimestre) &&
  trimestre >= 1 &&
  trimestre <= 4;

const indicePeriodo = (periodo: Periodo): number =>
  periodo.anio * 4 + (periodo.trimestre - 1);

const periodoDesdeIndice = (indice: number): Periodo => ({
  anio: Math.floor(indice / 4),
  trimestre: (indice % 4) + 1,
});

export const desplazarPeriodo = (periodo: Periodo, trimestres: number): Periodo =>
  periodoDesdeIndice(indicePeriodo(periodo) + trimestres);

export const periodoAnterior = (periodo: Periodo): Periodo =>
  desplazarPeriodo(periodo, -1);

export const mismoTrimestreAnioAnterior = (periodo: Periodo): Periodo => ({
  anio: periodo.anio - 1,
  trimestre: periodo.trimestre,
});

export const periodoComparacion = (
  periodo: Periodo,
  modo: ModoComparacion,
): Periodo =>
  modo === "MISMO_TRIMESTRE_ANIO_ANTERIOR"
    ? mismoTrimestreAnioAnterior(periodo)
    : periodoAnterior(periodo);

/** Devuelve `cantidad` periodos consecutivos terminando en `periodo` (del más antiguo al más reciente). */
export const periodosHistorico = (periodo: Periodo, cantidad: number): Periodo[] =>
  Array.from({ length: cantidad }, (_, i) =>
    desplazarPeriodo(periodo, i - (cantidad - 1)),
  );

export const compararPeriodos = (a: Periodo, b: Periodo): number =>
  indicePeriodo(a) - indicePeriodo(b);

export const clavePeriodo = (periodo: Periodo): string =>
  `${periodo.anio}-Q${periodo.trimestre}`;

export const etiquetaPeriodo = (periodo: Periodo): string =>
  `Q${periodo.trimestre} ${periodo.anio}`;

export const nombrePeriodo = (periodo: Periodo): string =>
  `${ORDINALES_TRIMESTRE[periodo.trimestre - 1]} trimestre de ${periodo.anio}`;

/** Primer día del trimestre en formato `YYYY-MM-DD` (mismo formato que `informe.periodo`). */
export const fechaInicioPeriodo = (periodo: Periodo): string =>
  `${periodo.anio}-${String((periodo.trimestre - 1) * 3 + 1).padStart(2, "0")}-01`;

/** Primer día del trimestre siguiente, útil como límite exclusivo. */
export const fechaFinExclusivaPeriodo = (periodo: Periodo): string =>
  fechaInicioPeriodo(desplazarPeriodo(periodo, 1));

/** Convierte `YYYY-MM-DD` al trimestre calendario que lo contiene. */
export const periodoDesdeFecha = (fecha: string): Periodo | null => {
  const coincidencia = /^(\d{4})-(\d{2})-/.exec(fecha);
  if (!coincidencia) {
    return null;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  if (mes < 1 || mes > 12) {
    return null;
  }

  return { anio, trimestre: Math.floor((mes - 1) / 3) + 1 };
};

export const descripcionComparacion = (
  modo: ModoComparacion,
  comparacion: Periodo,
): string =>
  modo === "MISMO_TRIMESTRE_ANIO_ANTERIOR"
    ? `mismo trimestre del año anterior (${etiquetaPeriodo(comparacion)})`
    : `trimestre anterior (${etiquetaPeriodo(comparacion)})`;
