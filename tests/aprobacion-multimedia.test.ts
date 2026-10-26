import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { datosAprobacionMultimedia } from "../src/helpers/aprobacionMultimedia";

describe("datos de aprobacion multimedia", () => {
  const fecha = new Date("2026-10-26T20:00:00.000Z");

  it("registra el instante real y la duracion autorizada, no el tiempo sugerido", () => {
    const datos = datosAprobacionMultimedia(new Date("2026-11-25T20:00:00.000Z"), fecha);
    assert.equal(datos.fechaAprobacion, fecha);
    assert.equal(datos.duracionAprobadaDias, 30);
  });

  it("conserva fracciones de dia y redondea diferencias de milisegundos a seis decimales", () => {
    assert.equal(
      datosAprobacionMultimedia(new Date("2026-10-28T08:00:00.000Z"), fecha).duracionAprobadaDias,
      1.5,
    );
    assert.equal(
      datosAprobacionMultimedia(new Date("2026-11-25T19:59:59.999Z"), fecha).duracionAprobadaDias,
      30,
    );
  });

  it("rechaza fechas invalidas, vencidas o iguales a la aprobacion", () => {
    for (const vencimiento of [new Date("invalida"), fecha, new Date(fecha.getTime() - 1)]) {
      assert.throws(() => datosAprobacionMultimedia(vencimiento, fecha), RangeError);
    }
  });
});
