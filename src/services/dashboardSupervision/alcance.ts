interface UnidadDeAlcance {
  ref: {
    tipo: string;
    id?: number;
    pais_id?: number | null;
    congregacion_id?: number | null;
  };
}

/** Only Congregación Ciudad units are expected to submit quarterly reports. */
export const unidadesInformantes = <T extends UnidadDeAlcance>(unidades: T[]): T[] =>
  unidades.filter((unidad) => unidad.ref.tipo === "CONGREGACION");

/** Returns the city units represented by a selected organizational unit. */
export const ciudadesDelDetalle = <T extends UnidadDeAlcance>(
  unidades: T[],
  tipo: string,
  id: number,
): T[] => {
  const seleccionada = unidades.find((unidad) => unidad.ref.tipo === tipo && unidad.ref.id === id);
  if (!seleccionada) return [];

  if (tipo === "CONGREGACION") return [seleccionada];
  if (tipo === "PAIS") {
    return unidades.filter(
      (unidad) => unidad.ref.tipo === "CONGREGACION" && unidad.ref.pais_id === id,
    );
  }
  if (tipo === "CAMPO") {
    const congregacionId = seleccionada.ref.congregacion_id;
    return unidades.filter(
      (unidad) =>
        unidad.ref.tipo === "CONGREGACION" &&
        unidad.ref.id === congregacionId,
    );
  }
  return [];
};
