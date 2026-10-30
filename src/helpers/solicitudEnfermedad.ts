export function errorSolicitudEnfermedad(datos: Record<string, unknown>): string | null {
  if (String(datos.razonSolicitud_id) !== "4") return null;
  const campos = [
    "personaEncamada", "enfermedadCronica", "personaInmunosuprimida", "impedimentoSalirCasa",
  ];
  if (!campos.every((campo) => typeof datos[campo] === "boolean")) {
    return "Debe responder Sí o No a las cuatro preguntas de enfermedad.";
  }
  if (!campos.some((campo) => datos[campo] === true)) {
    return "No puede continuar con la solicitud por enfermedad si responde No a las cuatro preguntas.";
  }
  return null;
}
