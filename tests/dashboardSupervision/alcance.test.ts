import assert from "node:assert/strict";
import test from "node:test";
import {
  ciudadesDelDetalle,
  unidadesInformantes,
} from "../../src/services/dashboardSupervision/alcance";

test("solo las Congregaciones Ciudad forman el alcance esperado de entrega", () => {
  const unidades = [
    { ref: { tipo: "PAIS", id: 1 } },
    { ref: { tipo: "CONGREGACION", id: 10 } },
    { ref: { tipo: "CONGREGACION", id: 11 } },
    { ref: { tipo: "CAMPO", id: 100 } },
  ];

  assert.deepEqual(unidadesInformantes(unidades), [unidades[1], unidades[2]]);
});

test("el detalle de país y campo usa informes de su Congregación Ciudad", () => {
  const unidades = [
    { ref: { tipo: "PAIS", id: 1 } },
    { ref: { tipo: "CONGREGACION", id: 10, pais_id: 1 } },
    { ref: { tipo: "CONGREGACION", id: 11, pais_id: 1 } },
    { ref: { tipo: "CAMPO", id: 100, congregacion_id: 10 } },
  ];

  assert.deepEqual(ciudadesDelDetalle(unidades, "PAIS", 1), [unidades[1], unidades[2]]);
  assert.deepEqual(ciudadesDelDetalle(unidades, "CAMPO", 100), [unidades[1]]);
  assert.deepEqual(ciudadesDelDetalle(unidades, "CONGREGACION", 11), [unidades[2]]);
});
