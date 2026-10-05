import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularPromedio,
  calcularVariacion,
  clasificarPorcentaje,
} from "../../src/services/dashboardSupervision/variacion";
import { detectarTendenciaConsecutiva } from "../../src/services/dashboardSupervision/tendencias";

describe("calcularVariacion", () => {
  it("100 -> 90 es una disminución del 10 %", () => {
    const v = calcularVariacion(100, 90);
    assert.equal(v.estado, "VARIACION");
    assert.equal(v.porcentaje, -10);
    assert.equal(v.diferencia, -10);
    assert.equal(v.direccion, "BAJA");
    assert.equal(v.tendencia, "DISMINUCION_SIGNIFICATIVA");
    assert.equal(v.mensaje, "↓ 10 %");
  });

  it("100 -> 110 es un incremento del 10 %", () => {
    const v = calcularVariacion(100, 110);
    assert.equal(v.porcentaje, 10);
    assert.equal(v.direccion, "SUBE");
    assert.equal(v.tendencia, "INCREMENTO_SIGNIFICATIVO");
    assert.equal(v.mensaje, "↑ 10 %");
  });

  it("formatea decimales con coma", () => {
    const v = calcularVariacion(320, 270);
    assert.equal(v.porcentaje, -15.63);
    assert.equal(v.mensaje, "↓ 15,6 %");
  });

  it("0 -> 50 no tiene base comparativa (nunca Infinity)", () => {
    const v = calcularVariacion(0, 50);
    assert.equal(v.estado, "SIN_BASE_COMPARATIVA");
    assert.equal(v.porcentaje, null);
    assert.equal(v.mensaje, "Nuevo registro / Sin base comparativa");
  });

  it("0 -> 0 es sin actividad", () => {
    const v = calcularVariacion(0, 0);
    assert.equal(v.estado, "SIN_ACTIVIDAD");
    assert.equal(v.porcentaje, null);
  });

  it("null -> 50 es sin información previa", () => {
    const v = calcularVariacion(null, 50);
    assert.equal(v.estado, "SIN_INFORMACION_PREVIA");
    assert.equal(v.porcentaje, null);
    assert.equal(v.diferencia, null);
  });

  it("50 -> null es información actual incompleta", () => {
    assert.equal(calcularVariacion(50, null).estado, "INFORMACION_ACTUAL_INCOMPLETA");
  });

  it("null -> null es sin información", () => {
    assert.equal(calcularVariacion(null, undefined).estado, "SIN_INFORMACION");
  });

  it("nunca devuelve NaN", () => {
    const v = calcularVariacion(Number.NaN, 10);
    assert.equal(v.estado, "SIN_INFORMACION_PREVIA");
    assert.ok(!Number.isNaN(v.porcentaje));
  });
});

describe("clasificarPorcentaje (umbrales configurables)", () => {
  const umbrales = { significativo: 10, moderado: 3 };
  const casos: [number, string][] = [
    [25, "INCREMENTO_SIGNIFICATIVO"],
    [10, "INCREMENTO_SIGNIFICATIVO"],
    [9.99, "INCREMENTO_MODERADO"],
    [3, "INCREMENTO_MODERADO"],
    [2.99, "ESTABLE"],
    [0, "ESTABLE"],
    [-2.99, "ESTABLE"],
    [-3, "DISMINUCION_MODERADA"],
    [-9.99, "DISMINUCION_MODERADA"],
    [-10, "DISMINUCION_SIGNIFICATIVA"],
    [-40, "DISMINUCION_SIGNIFICATIVA"],
  ];
  for (const [porcentaje, esperado] of casos) {
    it(`${porcentaje} % -> ${esperado}`, () => {
      assert.equal(clasificarPorcentaje(porcentaje, umbrales), esperado);
    });
  }

  it("respeta umbrales personalizados", () => {
    assert.equal(clasificarPorcentaje(12, { significativo: 20, moderado: 5 }), "INCREMENTO_MODERADO");
  });
});

describe("calcularPromedio", () => {
  it("divide de forma segura", () => {
    assert.equal(calcularPromedio(90, 4), 22.5);
    assert.equal(calcularPromedio(10, 0), null);
    assert.equal(calcularPromedio(null, 3), null);
  });
});

describe("detectarTendenciaConsecutiva", () => {
  it("200, 190, 180, 170 es disminución durante 3 trimestres", () => {
    const t = detectarTendenciaConsecutiva([200, 190, 180, 170], 3, 0);
    assert.ok(t);
    assert.equal(t.direccion, "DISMINUCION");
    assert.equal(t.periodos, 3);
  });

  it("100, 110, 120, 130 es crecimiento", () => {
    const t = detectarTendenciaConsecutiva([100, 110, 120, 130], 3, 0);
    assert.equal(t?.direccion, "CRECIMIENTO");
  });

  it("una subida interrumpe la racha", () => {
    assert.equal(detectarTendenciaConsecutiva([200, 190, 195, 180, 170], 3, 0), null);
  });

  it("un trimestre sin informe (null) interrumpe la racha", () => {
    assert.equal(detectarTendenciaConsecutiva([200, 190, null, 180, 170], 3, 0), null);
  });

  it("considera sólo la racha más reciente", () => {
    const t = detectarTendenciaConsecutiva([50, 300, 250, 200, 150, 100], 3, 0);
    assert.equal(t?.periodos, 4);
  });

  it("respeta la variación mínima configurada", () => {
    assert.equal(detectarTendenciaConsecutiva([100, 99, 98, 97], 3, 5), null);
  });

  it("valores iguales no forman tendencia", () => {
    assert.equal(detectarTendenciaConsecutiva([100, 100, 100, 100], 3, 0), null);
  });
});
