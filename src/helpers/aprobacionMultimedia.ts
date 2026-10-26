export function datosAprobacionMultimedia(vencimiento: Date, fechaAprobacion = new Date()) {
  const duracion = vencimiento.getTime() - fechaAprobacion.getTime();
  if (!Number.isFinite(duracion) || duracion <= 0) {
    throw new RangeError("El vencimiento debe ser una fecha posterior a la aprobacion.");
  }
  return {
    fechaAprobacion,
    duracionAprobadaDias: Math.round((duracion / 86400000) * 1000000) / 1000000,
  };
}
