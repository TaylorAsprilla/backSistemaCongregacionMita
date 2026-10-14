import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  obtenerFechaCierreInforme,
  obtenerPeriodoInformeActivo,
} from "../src/helpers/periodoInforme";

describe("periodo activo del informe", () => {
  it("conserva el tercer trimestre de 2026 hasta su cierre especial", () => {
    assert.equal(obtenerPeriodoInformeActivo(new Date("2026-10-10T18:00:00Z")), "2026-07-01");
    assert.equal(obtenerPeriodoInformeActivo(new Date("2026-10-14T05:04:59Z")), "2026-07-01");
    assert.equal(obtenerPeriodoInformeActivo(new Date("2026-10-14T05:05:00Z")), "2026-10-01");
    assert.equal(obtenerPeriodoInformeActivo(new Date("2026-10-14T18:58:00Z")), "2026-10-01");
  });

  it("cambia los periodos habituales el dia 8 a las 05:05 UTC", () => {
    for (const [cierre, anterior, siguiente] of [
      ["2026-04-08T05:05:00Z", "2026-01-01", "2026-04-01"],
      ["2026-07-08T05:05:00Z", "2026-04-01", "2026-07-01"],
      ["2027-01-08T05:05:00Z", "2026-10-01", "2027-01-01"],
      ["2027-10-08T05:05:00Z", "2027-07-01", "2027-10-01"],
    ]) {
      const fecha = new Date(cierre);
      assert.equal(obtenerPeriodoInformeActivo(new Date(fecha.getTime() - 1)), anterior);
      assert.equal(obtenerPeriodoInformeActivo(fecha), siguiente);
    }
  });

  it("comparte las fechas de cierre con el cron", () => {
    assert.equal(obtenerFechaCierreInforme(3, 2026).toISOString(), "2026-10-14T05:05:00.000Z");
    assert.equal(obtenerFechaCierreInforme(4, 2026).toISOString(), "2027-01-08T05:05:00.000Z");
  });
});
