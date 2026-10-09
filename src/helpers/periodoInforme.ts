const ZONA_HORARIA_COLOMBIA = "America/Bogota";

export function obtenerPeriodoInformeActivo(fecha: Date = new Date()): string {
  const partesFecha = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA_COLOMBIA,
    year: "numeric",
    month: "numeric",
  }).formatToParts(fecha);
  const anio = Number(partesFecha.find((parte) => parte.type === "year")?.value);
  const mes = Number(partesFecha.find((parte) => parte.type === "month")?.value) - 1;
  const mesInicioTrimestre = Math.floor(mes / 3) * 3;
  const fechaCierre = new Date(Date.UTC(anio, mesInicioTrimestre, 10, 5, 5));
  let anioPeriodo = anio;
  let mesPeriodo = mesInicioTrimestre;

  if (fecha < fechaCierre) {
    mesPeriodo -= 3;
    if (mesPeriodo < 0) {
      mesPeriodo += 12;
      anioPeriodo -= 1;
    }
  }

  return `${anioPeriodo}-${String(mesPeriodo + 1).padStart(2, "0")}-01`;
}
