export const paisPerteneceAlAlcance = (paisId: number, paisesAutorizados: number[]): boolean =>
  paisesAutorizados.includes(paisId);

const normalizarPermiso = (permiso: string): string =>
  permiso
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

export const tienePermisoObreroPais = (
  permisosIds: string[],
  nombresPermisos: string[],
  permisoObreroPaisId: string,
): boolean =>
  permisosIds.includes(permisoObreroPaisId) ||
  nombresPermisos.some((permiso) => normalizarPermiso(permiso) === "OBRERO PAIS");
