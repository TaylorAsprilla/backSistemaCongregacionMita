const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const { getInformesPorTrimestreYPais } = require("../build/src/controllers/informe.controller");

const model = (nombre) => require(`../build/src/models/${nombre}.model`).default;
const registro = (datos) => ({
  ...datos,
  get: (campo) => datos[campo],
  toJSON: () => datos,
});

for (const cantidad of [0, 1, 40]) {
  test(`carga ${cantidad} informes sin multiplicar consultas de relaciones`, async () => {
    const originales = [];
    const sustituir = (objeto, metodo, funcion) => {
      const original = objeto[metodo];
      originales.push(() => { objeto[metodo] = original; });
      objeto[metodo] = funcion;
    };
    try {
      const usuario = registro({
        id: 7, primerNombre: "Prueba", segundoNombre: "",
        primerApellido: "Informe", segundoApellido: "",
      });
      sustituir(model("pais"), "findByPk", async () => registro({ id: 2, pais: "Prueba" }));
      sustituir(model("congregacion"), "findAll", async () => [
        registro({ id: 3, congregacion: "Centro", idObreroEncargado: 7 }),
      ]);
      sustituir(model("campo"), "findAll", async () => []);
      sustituir(model("usuario"), "findAll", async () => [usuario]);
      sustituir(model("informe"), "findAll", async (opciones) => {
        assert.equal(opciones.include[1].separate, true);
        assert.equal(opciones.include[2].separate, true);
        return Array.from({ length: cantidad }, (_, indice) => {
          const informe = registro({
            id: indice + 1, usuario_id: 7, periodo: "2026-07-01",
            estado: "Abierto", createdAt: "2026-07-15",
          });
          informe.usuario = usuario;
          return informe;
        });
      });
      let consultas = 0;
      let activas = 0;
      let maxActivas = 0;
      for (const nombre of ["visita", "situacionVisita", "diezmos", "logro", "meta"]) {
        sustituir(model(nombre), "findAll", async (opciones) => {
          consultas++;
          activas++;
          maxActivas = Math.max(maxActivas, activas);
          assert.equal(opciones.where.informe_id[Op.in].length, cantidad);
          await new Promise((resolve) => setImmediate(resolve));
          activas--;
          return [registro({ id: 99, informe_id: 1 })];
        });
      }
      let respuesta;
      await getInformesPorTrimestreYPais(
        { query: { trimestre: "3", año: "2026", pais_id: "2" } },
        {
          json: (datos) => { respuesta = JSON.parse(JSON.stringify(datos)); },
          status: () => { throw new Error("La consulta no debe fallar"); },
        },
      );
      assert.equal(respuesta.ok, true);
      assert.equal(respuesta.informes.length, cantidad);
      assert.equal(consultas, cantidad ? 5 : 0);
      assert.equal(maxActivas, cantidad ? 1 : 0);
      if (cantidad) {
        for (const clave of ["visitas", "situacionVisita", "aspectoContable", "logros", "metas"]) {
          assert.equal(respuesta.informes[0][clave][0].informe_id, 1);
          if (cantidad > 1) assert.deepEqual(respuesta.informes[1][clave], []);
        }
      }
    } finally {
      originales.reverse().forEach((restaurar) => restaurar());
    }
  });
}
