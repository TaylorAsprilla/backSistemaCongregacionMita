import { DASHBOARD_SUPERVISION_CONFIG } from "../../config/dashboardSupervision.config";

export type CategoriaActividad =
  | "SERVICIO_LUNES"
  | "SERVICIO_MARTES"
  | "SERVICIO_MIERCOLES"
  | "SERVICIO_JUEVES"
  | "SERVICIO_VIERNES"
  | "SERVICIO_SABADO"
  | "SERVICIO_DOMINGO"
  | "SERVICIO_OTROS_DIAS"
  | "CONSEJERO"
  | "VIGILIA"
  | "OTRA";

export const CATEGORIAS_SERVICIO: CategoriaActividad[] = [
  "SERVICIO_MARTES",
  "SERVICIO_JUEVES",
  "SERVICIO_SABADO",
  "SERVICIO_DOMINGO",
  "SERVICIO_LUNES",
  "SERVICIO_MIERCOLES",
  "SERVICIO_VIERNES",
  "SERVICIO_OTROS_DIAS",
];

export const ETIQUETAS_CATEGORIA_ACTIVIDAD: Record<CategoriaActividad, string> = {
  SERVICIO_LUNES: "Servicio del lunes",
  SERVICIO_MARTES: "Servicio del martes",
  SERVICIO_MIERCOLES: "Servicio del miércoles",
  SERVICIO_JUEVES: "Servicio del jueves",
  SERVICIO_VIERNES: "Servicio del viernes",
  SERVICIO_SABADO: "Servicio del sábado",
  SERVICIO_DOMINGO: "Servicio del domingo",
  SERVICIO_OTROS_DIAS: "Servicio con día no especificado",
  CONSEJERO: "Consejeros",
  VIGILIA: "Vigilias",
  OTRA: "Otras actividades",
};

/** Minúsculas, sin tildes y con espacios normalizados. */
export const normalizarTexto = (texto: string | null | undefined): string =>
  (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const DIAS_POR_NOMBRE: Record<string, number> = {
  domingo: 1,
  lunes: 2,
  martes: 3,
  miercoles: 4,
  jueves: 5,
  viernes: 6,
  sabado: 7,
};

/** Día de la semana (1 = domingo … 7 = sábado, igual que MySQL DAYOFWEEK) mencionado en el nombre. */
export const diaEnNombre = (nombre: string): number | null => {
  const normalizado = normalizarTexto(nombre);
  for (const [dia, valor] of Object.entries(DIAS_POR_NOMBRE)) {
    if (new RegExp(`\\b${dia}\\b`).test(normalizado)) {
      return valor;
    }
  }
  return null;
};

const contieneAlguna = (texto: string, palabras: string[]) =>
  palabras.some((palabra) => texto.includes(palabra));

/**
 * Clasifica una actividad eclesiástica.
 * El día se toma del nombre del tipo (p. ej. "Servicio Martes"); si el nombre no
 * lo indica se usa el día real de la fecha (`diaSemana`, 1 = domingo … 7 = sábado).
 */
export const clasificarActividad = (
  nombreTipo: string | null | undefined,
  diaSemana: number | null | undefined,
): CategoriaActividad => {
  const nombre = normalizarTexto(nombreTipo);
  const { palabrasConsejero, palabrasVigilia, palabrasServicio } =
    DASHBOARD_SUPERVISION_CONFIG.actividades;

  if (contieneAlguna(nombre, palabrasConsejero)) return "CONSEJERO";
  if (contieneAlguna(nombre, palabrasVigilia)) return "VIGILIA";
  if (!contieneAlguna(nombre, palabrasServicio)) return "OTRA";

  const dia = diaEnNombre(nombre) ?? diaSemana ?? null;
  if (dia === 2) return "SERVICIO_LUNES";
  if (dia === 3) return "SERVICIO_MARTES";
  if (dia === 4) return "SERVICIO_MIERCOLES";
  if (dia === 5) return "SERVICIO_JUEVES";
  if (dia === 6) return "SERVICIO_VIERNES";
  if (dia === 7) return "SERVICIO_SABADO";
  if (dia === 1) return "SERVICIO_DOMINGO";
  return "SERVICIO_OTROS_DIAS";
};
