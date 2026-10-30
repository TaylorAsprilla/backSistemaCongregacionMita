import assert from "node:assert/strict";
import { test } from "node:test";
import { errorSolicitudEnfermedad } from "../src/helpers/solicitudEnfermedad";

const campos = [
  "personaEncamada", "enfermedadCronica", "personaInmunosuprimida", "impedimentoSalirCasa",
];
const respuestas = (mascara: number): Record<string, unknown> => ({
  razonSolicitud_id: 4,
  ...Object.fromEntries(campos.map((campo, indice) => [campo, Boolean(mascara & (1 << indice))])),
});

test("enfermedad: rechaza cuatro No y acepta cualquiera de las 15 combinaciones con Sí", () => {
  assert.match(errorSolicitudEnfermedad(respuestas(0))!, /No a las cuatro/);
  for (let mascara = 1; mascara < 16; mascara++) {
    assert.equal(errorSolicitudEnfermedad(respuestas(mascara)), null);
  }
});

test("enfermedad: exige cuatro respuestas booleanas sin interpretar cadenas como Sí", () => {
  for (const campo of campos) {
    for (const valor of [undefined, null, "", "false", "true", 0, 1]) {
      assert.match(errorSolicitudEnfermedad({ ...respuestas(15), [campo]: valor })!, /Debe responder/);
    }
  }
  assert.equal(errorSolicitudEnfermedad({ razonSolicitud_id: 1 }), null);
});
