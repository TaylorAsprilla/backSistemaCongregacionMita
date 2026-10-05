import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  etiquetaPeriodo,
  fechaInicioPeriodo,
  mismoTrimestreAnioAnterior,
  nombrePeriodo,
  periodoAnterior,
  periodoComparacion,
  periodoDesdeFecha,
  periodosHistorico,
} from "../../src/services/dashboardSupervision/periodos";

describe("periodos", () => {
  it("Q3 2026 se compara con Q2 2026", () => {
    assert.deepEqual(periodoAnterior({ anio: 2026, trimestre: 3 }), { anio: 2026, trimestre: 2 });
  });

  it("Q1 2026 se compara con Q4 2025", () => {
    assert.deepEqual(periodoAnterior({ anio: 2026, trimestre: 1 }), { anio: 2025, trimestre: 4 });
  });

  it("Q3 2026 se compara con Q3 2025 en modo anual", () => {
    assert.deepEqual(mismoTrimestreAnioAnterior({ anio: 2026, trimestre: 3 }), {
      anio: 2025,
      trimestre: 3,
    });
    assert.deepEqual(
      periodoComparacion({ anio: 2026, trimestre: 3 }, "MISMO_TRIMESTRE_ANIO_ANTERIOR"),
      { anio: 2025, trimestre: 3 },
    );
  });

  it("genera histórico ordenado cruzando años", () => {
    const historico = periodosHistorico({ anio: 2026, trimestre: 2 }, 4);
    assert.deepEqual(historico.map(etiquetaPeriodo), ["Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"]);
  });

  it("etiquetas y fechas", () => {
    assert.equal(nombrePeriodo({ anio: 2026, trimestre: 3 }), "tercer trimestre de 2026");
    assert.equal(fechaInicioPeriodo({ anio: 2026, trimestre: 4 }), "2026-10-01");
  });

  it("convierte fechas al trimestre", () => {
    assert.deepEqual(periodoDesdeFecha("2026-07-01"), { anio: 2026, trimestre: 3 });
    assert.deepEqual(periodoDesdeFecha("2026-12-31"), { anio: 2026, trimestre: 4 });
    assert.equal(periodoDesdeFecha("fecha"), null);
  });
});
