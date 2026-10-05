import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularVariacion } from "../../src/services/dashboardSupervision/variacion";
import {
  contarPorGrupo,
  grupoDeVariacion,
  gruposDeFiltro,
  servicioVariacion,
} from "../../src/services/dashboardSupervision/variacionServicios";

describe("variación de asistencia por servicio", () => {
  it("agrupa por tendencia y deja sin comparación lo que no tiene base", () => {
    assert.equal(grupoDeVariacion(calcularVariacion(100, 80)), "DISMINUCION_SIGNIFICATIVA");
    assert.equal(grupoDeVariacion(calcularVariacion(100, 95)), "DISMINUCION_MODERADA");
    assert.equal(grupoDeVariacion(calcularVariacion(100, 101)), "ESTABLE");
    assert.equal(grupoDeVariacion(calcularVariacion(100, 105)), "INCREMENTO_MODERADO");
    assert.equal(grupoDeVariacion(calcularVariacion(100, 120)), "INCREMENTO_SIGNIFICATIVO");
    assert.equal(grupoDeVariacion(calcularVariacion(null, 50)), "SIN_COMPARACION");
    assert.equal(grupoDeVariacion(calcularVariacion(0, 50)), "SIN_COMPARACION");
    assert.equal(grupoDeVariacion(undefined), "SIN_COMPARACION");
  });

  it("cuenta cada congregación una sola vez y el total coincide", () => {
    const conteo = contarPorGrupo([
      calcularVariacion(100, 80),
      calcularVariacion(100, 70),
      calcularVariacion(100, 100),
      calcularVariacion(null, null),
    ]);
    assert.deepEqual(conteo, {
      DISMINUCION_SIGNIFICATIVA: 2,
      DISMINUCION_MODERADA: 0,
      ESTABLE: 1,
      INCREMENTO_MODERADO: 0,
      INCREMENTO_SIGNIFICATIVO: 0,
      SIN_COMPARACION: 1,
    });
  });

  it("interpreta filtros individuales y agrupados", () => {
    assert.deepEqual(gruposDeFiltro("DISMINUYO"), ["DISMINUCION_SIGNIFICATIVA", "DISMINUCION_MODERADA"]);
    assert.deepEqual(gruposDeFiltro("AUMENTO"), ["INCREMENTO_MODERADO", "INCREMENTO_SIGNIFICATIVO"]);
    assert.deepEqual(gruposDeFiltro("ESTABLE"), ["ESTABLE"]);
    assert.deepEqual(gruposDeFiltro("SIN_COMPARACION"), ["SIN_COMPARACION"]);
    assert.equal(gruposDeFiltro("OTRO"), null);
    assert.equal(gruposDeFiltro(undefined), null);
  });

  it("resuelve el indicador de cada servicio", () => {
    assert.equal(servicioVariacion("domingo")?.indicador, "promedioServicioDomingo");
    assert.equal(servicioVariacion("general")?.indicador, "promedioAsistenciaServicio");
    assert.equal(servicioVariacion("x"), undefined);
  });
});
