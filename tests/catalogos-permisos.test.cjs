const { test } = require("node:test");
const assert = require("node:assert/strict");
const consultas = require("../build/src/services/dashboardSupervision/consultas");

for (const [nombre, controlador, metodo, clave] of [
  ["Países", "pais", "getPaises", "pais"],
  ["Congregaciones", "congregacion", "getCongregaciones", "congregacion"],
  ["Campos", "campo", "getCampos", "campo"],
]) {
  test(`${nombre}: listado sin consultar permisos ni filtrar por país`, async () => {
    const modelo = require(`../build/src/models/${controlador}.model`).default;
    const handler = require(`../build/src/controllers/${controlador}.controller`)[metodo];
    const originalFindAll = modelo.findAll;
    const originalPermisos = consultas.obtenerPermisosUsuario;
    try {
      consultas.obtenerPermisosUsuario = async () => {
        throw new Error("Los catálogos no deben consultar permisos");
      };
      modelo.findAll = async (opciones) => {
        assert.deepEqual(opciones.where, controlador === "pais" ? undefined : { estado: true });
        return [{ id: 1 }, { id: 2 }];
      };
      let respuesta;
      await handler({ id: 77 }, {
        json: (datos) => { respuesta = datos; },
        status: () => { throw new Error("El listado no debe fallar"); },
      });
      assert.equal(respuesta.ok, true);
      assert.equal(respuesta[clave].length, 2);
    } finally {
      modelo.findAll = originalFindAll;
      consultas.obtenerPermisosUsuario = originalPermisos;
    }
  });
}
