import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import type * as Servicio from "../../src/services/dashboardSupervision.service";
import type { FiltrosDashboard } from "../../src/types/dashboardSupervision.dto";

const preparar = () => {
  const ruta = require.resolve("../../src/services/dashboardSupervision.service");
  const requireServicio = createRequire(ruta);
  const exports: Partial<typeof Servicio> = {};
  let usuarios: number[] = [];
  runInNewContext(readFileSync(ruta, "utf8"), {
    exports,
    console,
    require: (nombre: string) => nombre === "./dashboardSupervision/consultas" ? {
      obtenerPaises: async () => [
        { id: 1, nombre: "País A", obreros: [10] }, { id: 2, nombre: "País B", obreros: [20] },
      ],
      obtenerCongregaciones: async () => [
        { id: 11, nombre: "Ciudad A", pais_id: 1, obreros: [11, 12] },
        { id: 21, nombre: "Ciudad B", pais_id: 2, obreros: [21] },
      ],
      obtenerCampos: async () => [
        { id: 111, nombre: "Campo A", congregacion_id: 11, obreros: [13, 14] },
        { id: 112, nombre: "Campo vacío", congregacion_id: 11, obreros: [] },
        { id: 211, nombre: "Campo B", congregacion_id: 21, obreros: [22] },
      ],
      obtenerCategoriasEspirituales: async () => [],
      obtenerListadoInformes: async (...argumentos: unknown[]) => {
        usuarios = argumentos[5] as number[];
        return { informes: [], total: 0, pagina: 1, porPagina: 10, totalPaginas: 1 };
      },
    } : requireServicio(nombre),
  });
  const consultar = exports.obtenerListadoInformes;
  if (!consultar) throw new Error("Falta obtenerListadoInformes");
  const filtros: FiltrosDashboard = {
    anio: 2026, trimestre: 3, pais_id: null, congregacion_id: null, campo_id: null,
    comparacion: "TRIMESTRE_ANTERIOR",
  };
  return {
    consultar: async (seleccion: Partial<FiltrosDashboard>) => {
      await consultar({ ...filtros, ...seleccion }, {});
      return Array.from(usuarios).sort((a, b) => a - b);
    },
  };
};

describe("alcance geográfico del listado de informes", () => {
  it("sin filtros incluye todos los responsables", async () => {
    assert.deepEqual(await preparar().consultar({}), [10, 11, 12, 13, 14, 20, 21, 22]);
  });
  it("país incluye sus responsables y los de sus ciudades y campos", async () => {
    assert.deepEqual(await preparar().consultar({ pais_id: 1 }), [10, 11, 12, 13, 14]);
  });
  it("ciudad incluye ambos responsables y los de sus campos", async () => {
    assert.deepEqual(await preparar().consultar({ pais_id: 1, congregacion_id: 11 }), [11, 12, 13, 14]);
  });
  it("campo excluye al responsable del país y de la ciudad", async () => {
    assert.deepEqual(await preparar().consultar({ campo_id: 111 }), [13, 14]);
  });
  it("campo sin responsables no muestra informes de su ciudad", async () => {
    assert.deepEqual(await preparar().consultar({ campo_id: 112 }), []);
  });
  it("rechaza un campo de otro país", async () => {
    await assert.rejects(preparar().consultar({ pais_id: 2, campo_id: 111 }), /no pertenece/);
  });
});
