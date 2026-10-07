import assert from "node:assert/strict";
import test from "node:test";
import {
  paisPerteneceAlAlcance,
  tienePermisoObreroPais,
} from "../../src/services/supervisionPais.scope";

test("permite consultar un país asignado al Obrero País", () => {
  assert.equal(paisPerteneceAlAlcance(1, [1]), true);
});

test("deniega consultar otro país aunque se manipule el id enviado", () => {
  assert.equal(paisPerteneceAlAlcance(2, [1]), false);
});

test("deniega si el usuario no tiene países asignados", () => {
  assert.equal(paisPerteneceAlAlcance(1, []), false);
});

test("reconoce el permiso de Obrero País por su nombre aunque el id configurado difiera", () => {
  assert.equal(tienePermisoObreroPais([], ["OBRERO PAÍS"], "2"), true);
});

test("reconoce variantes acentuadas del nombre de permiso", () => {
  assert.equal(tienePermisoObreroPais([], ["  obrero pais  "], "2"), true);
});

test("no concede acceso a otro rol", () => {
  assert.equal(tienePermisoObreroPais(["3"], ["SUPERVISOR LOCAL"], "2"), false);
});

test("reconoce Obrero País aunque el perfil también incluya Administrador", () => {
  assert.equal(tienePermisoObreroPais(["1", "2"], ["ADMINISTRADOR", "OBRERO PAÍS"], "2"), true);
});
