function formatearFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
}

export function obtenerPeriodoInformeActivo(fecha: Date = new Date()): string {
  const mesInicioTrimestre = Math.floor(fecha.getMonth() / 3) * 3;
  const fechaCierre = new Date(fecha.getFullYear(), mesInicioTrimestre, 9, 0, 5);
  const fechaInicio = new Date(fecha.getFullYear(), mesInicioTrimestre, 1);

  if (fecha < fechaCierre) {
    fechaInicio.setMonth(fechaInicio.getMonth() - 3);
  }

  return formatearFecha(fechaInicio);
}
