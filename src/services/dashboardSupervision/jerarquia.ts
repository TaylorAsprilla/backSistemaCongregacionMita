import { FiltrosDashboard } from "../../types/dashboardSupervision.dto";
import { esModoComparacion, esPeriodoValido, Periodo } from "./periodos";

export interface CatalogoJerarquia {
  paises: Map<number, { id: number }>;
  congregaciones: Map<number, { id: number; pais_id: number | null }>;
  campos: Map<number, { id: number; congregacion_id: number | null }>;
}

type Resultado<T> = { ok: true; valor: T } | { ok: false; msg: string };

const leerEntero = (valor: unknown): number | null | undefined => {
  if (valor === undefined || valor === null || valor === "" || valor === "null") {
    return null;
  }
  const texto = String(valor).trim();
  if (!/^\d+$/.test(texto)) return undefined;
  return Number(texto);
};

/**
 * Lee y valida los parámetros de consulta comunes del dashboard.
 * Acepta `anio` o `año`. Si no se envía periodo, se usa el periodo activo.
 */
export const parsearFiltros = (
  query: Record<string, unknown>,
  periodoActivo: Periodo,
): Resultado<FiltrosDashboard> => {
  const anioCrudo = query.anio ?? query["año"];
  const anio = leerEntero(anioCrudo);
  const trimestre = leerEntero(query.trimestre);
  const pais_id = leerEntero(query.pais_id);
  const congregacion_id = leerEntero(query.congregacion_id);
  const campo_id = leerEntero(query.campo_id);

  if ([anio, trimestre, pais_id, congregacion_id, campo_id].includes(undefined)) {
    return { ok: false, msg: "Los filtros numéricos deben ser enteros positivos." };
  }

  const periodo: Periodo = {
    anio: anio ?? periodoActivo.anio,
    trimestre: trimestre ?? periodoActivo.trimestre,
  };
  if (!esPeriodoValido(periodo.anio, periodo.trimestre)) {
    return { ok: false, msg: "El año o el trimestre no son válidos." };
  }

  const comparacion = query.comparacion ?? "TRIMESTRE_ANTERIOR";
  if (!esModoComparacion(comparacion)) {
    return { ok: false, msg: "El modo de comparación no es válido." };
  }

  return {
    ok: true,
    valor: {
      anio: periodo.anio,
      trimestre: periodo.trimestre,
      pais_id: pais_id ?? null,
      congregacion_id: congregacion_id ?? null,
      campo_id: campo_id ?? null,
      comparacion,
    },
  };
};

/** Verifica que país, congregación y campo existan y pertenezcan a la misma rama de la jerarquía. */
export const validarJerarquia = (
  filtros: Pick<FiltrosDashboard, "pais_id" | "congregacion_id" | "campo_id">,
  catalogo: CatalogoJerarquia,
): string | null => {
  const { pais_id, congregacion_id, campo_id } = filtros;

  if (pais_id !== null && !catalogo.paises.has(pais_id)) {
    return "El país seleccionado no existe.";
  }

  if (congregacion_id !== null) {
    const congregacion = catalogo.congregaciones.get(congregacion_id);
    if (!congregacion) return "La congregación seleccionada no existe.";
    if (pais_id !== null && congregacion.pais_id !== pais_id) {
      return "La congregación seleccionada no pertenece al país indicado.";
    }
  }

  if (campo_id !== null) {
    const campo = catalogo.campos.get(campo_id);
    if (!campo) return "El campo seleccionado no existe.";
    if (congregacion_id !== null && campo.congregacion_id !== congregacion_id) {
      return "El campo seleccionado no pertenece a la congregación indicada.";
    }
    if (pais_id !== null) {
      const congregacionCampo =
        campo.congregacion_id !== null
          ? catalogo.congregaciones.get(campo.congregacion_id)
          : undefined;
      if (!congregacionCampo || congregacionCampo.pais_id !== pais_id) {
        return "El campo seleccionado no pertenece al país indicado.";
      }
    }
  }

  return null;
};
