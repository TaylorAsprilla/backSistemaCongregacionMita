import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import type * as Servicio from "../../src/services/dashboardSupervision.service";
import type { FiltrosDashboard } from "../../src/types/dashboardSupervision.dto";

const preparar = (
  autores: number[] = [],
  informes?: Array<Record<string, unknown>>,
) => {
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
        return {
          informes: informes ?? autores.map((usuario_id) => ({
            id: usuario_id, usuario_id, obrero: `Obrero ${usuario_id}`, estado: "Abierto", periodo: "2026-07-01",
            tipo_congregacion: usuario_id === 10 ? "PAIS" : usuario_id === 13 ? "CAMPO" : "CONGREGACION",
            congregacion_id: usuario_id === 10 ? 1 : usuario_id === 13 ? 111 : 11,
            nombre_pais: null, nombre_congregacion: null, nombre_campo: null,
          })),
          total: autores.length, pagina: 1, porPagina: 10, totalPaginas: 1,
        };
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
    informes: async (seleccion: Partial<FiltrosDashboard> = {}) =>
      (await consultar({ ...filtros, ...seleccion }, {})).informes,
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
  it("muestra la ciudad y el país del responsable sin inventar un campo", async () => {
    const [informe] = await preparar([11]).informes();
    assert.equal(informe.pais, "País A");
    assert.equal(informe.ciudad, "Ciudad A");
    assert.equal(informe.campo, null);
    assert.equal(informe.obrero, "Obrero 11");
    assert.equal(informe.estado, "Abierto");
  });
  it("muestra la jerarquía completa de un responsable de campo", async () => {
    const [informe] = await preparar([13]).informes({ campo_id: 111 });
    assert.equal(informe.pais, "País A");
    assert.equal(informe.ciudad, "Ciudad A");
    assert.equal(informe.campo, "Campo A");
  });
  it("no asigna ciudad ni campo al responsable del país", async () => {
    const [informe] = await preparar([10]).informes();
    assert.equal(informe.pais, "País A");
    assert.equal(informe.ciudad, null);
    assert.equal(informe.campo, null);
  });
  it("separa las congregaciones de dos informes del mismo obrero", async () => {
    const informes = await preparar([], [
      {
        id: 112, usuario_id: 2952, estado: "Abierto",
        tipo_congregacion: "PAIS", congregacion_id: 2,
        nombre_pais: "País B", nombre_congregacion: null, nombre_campo: null,
      },
      {
        id: 113, usuario_id: 2952, estado: "Abierto",
        tipo_congregacion: "CONGREGACION", congregacion_id: 11,
        nombre_pais: "País A", nombre_congregacion: "Ciudad A", nombre_campo: null,
      },
    ]).informes();
    assert.equal(informes[0].pais, "País B");
    assert.equal(informes[0].ciudad, null);
    assert.equal(informes[0].campo, null);
    assert.equal(informes[1].pais, "País A");
    assert.equal(informes[1].ciudad, "Ciudad A");
    assert.equal(informes[1].campo, null);
  });
  it("conserva la jerarquía histórica de un informe cerrado", async () => {
    const [informe] = await preparar([], [{
      id: 1, usuario_id: 11, estado: "Cerrado",
      tipo_congregacion: "CONGREGACION", congregacion_id: 11,
      nombre_pais: "País al cierre", nombre_congregacion: "Ciudad al cierre",
      nombre_campo: "No corresponde",
    }]).informes();
    assert.equal(informe.pais, "País al cierre");
    assert.equal(informe.ciudad, "Ciudad al cierre");
    assert.equal(informe.campo, null);
  });
  it("no infiere la congregación de un informe legado desde su autor", async () => {
    const [informe] = await preparar([], [{
      id: 1, usuario_id: 11, estado: "Cerrado",
      tipo_congregacion: null, congregacion_id: null,
      nombre_pais: null, nombre_congregacion: null, nombre_campo: null,
    }]).informes();
    assert.equal(informe.pais, null);
    assert.equal(informe.ciudad, null);
    assert.equal(informe.campo, null);
  });
});
