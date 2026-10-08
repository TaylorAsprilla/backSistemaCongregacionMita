const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const Usuario = require("../build/src/models/usuario.model").default;
const Pais = require("../build/src/models/pais.model").default;
const Congregacion = require("../build/src/models/congregacion.model").default;
const Campo = require("../build/src/models/campo.model").default;
const { getResponsabilidadesObrero } = require("../build/src/controllers/usuario.controller");

const fila = (datos) => ({ getDataValue: (campo) => datos[campo] });
const respuesta = () => ({
  codigo: 200,
  status(codigo) { this.codigo = codigo; return this; },
  json(datos) { this.datos = datos; return this; },
});

test("muestra todos los niveles, ambos encargados y unidades inactivas", async (t) => {
  t.mock.method(Usuario, "findByPk", async () => fila({ id: 2182 }));
  t.mock.method(Pais, "findAll", async ({ where }) => {
    assert.deepEqual(where, { idObreroEncargado: 2182 });
    return [fila({ id: 2, pais: "Colombia", estado: true })];
  });
  const filtro = { [Op.or]: [{ idObreroEncargado: 2182 }, { idObreroEncargadoDos: 2182 }] };
  t.mock.method(Congregacion, "findAll", async ({ where }) => {
    assert.deepEqual(where, filtro);
    return [
      fila({ id: 5, congregacion: "Buenaventura", estado: true, idObreroEncargado: 2182 }),
      fila({ id: 40, congregacion: "Cali", estado: false, idObreroEncargadoDos: 2182 }),
    ];
  });
  t.mock.method(Campo, "findAll", async ({ where }) => {
    assert.deepEqual(where, filtro);
    return [
      fila({ id: 139, campo: "Centro", estado: true, idObreroEncargado: 2182 }),
      fila({ id: 140, campo: "Norte", estado: true, idObreroEncargadoDos: 2182 }),
    ];
  });
  const res = respuesta();
  await getResponsabilidadesObrero({ params: { id: "2182" } }, res);
  assert.equal(res.codigo, 200);
  assert.deepEqual(res.datos, {
    ok: true,
    responsabilidades: [
      { id: 2, nombre: "Colombia", tipo: "PAIS", rol: "PRINCIPAL", activo: true },
      { id: 5, nombre: "Buenaventura", tipo: "CIUDAD", rol: "PRINCIPAL", activo: true },
      { id: 40, nombre: "Cali", tipo: "CIUDAD", rol: "SEGUNDO", activo: false },
      { id: 139, nombre: "Centro", tipo: "CAMPO", rol: "PRINCIPAL", activo: true },
      { id: 140, nombre: "Norte", tipo: "CAMPO", rol: "SEGUNDO", activo: true },
    ],
  });
});

test("usuario sin responsabilidades no se confunde con usuario inexistente", async (t) => {
  const usuario = t.mock.method(Usuario, "findByPk", async () => fila({ id: 10 }));
  for (const modelo of [Pais, Congregacion, Campo]) {
    t.mock.method(modelo, "findAll", async () => []);
  }
  const res = respuesta();
  await getResponsabilidadesObrero({ params: { id: "10" } }, res);
  assert.deepEqual(res.datos, { ok: true, responsabilidades: [] });
  usuario.mock.mockImplementation(async () => null);
  const inexistente = respuesta();
  await getResponsabilidadesObrero({ params: { id: "10" } }, inexistente);
  assert.equal(inexistente.codigo, 404);
});

test("rechaza ID invalido y comunica fallos de consulta", async (t) => {
  const consulta = t.mock.method(Usuario, "findByPk", async () => { throw new Error("consulta fallida"); });
  t.mock.method(console, "error", () => {});
  for (const id of ["0", "-1", "abc", "1.5"]) {
    const res = respuesta();
    await getResponsabilidadesObrero({ params: { id } }, res);
    assert.equal(res.codigo, 400);
  }
  assert.equal(consulta.mock.callCount(), 0);
  const res = respuesta();
  await getResponsabilidadesObrero({ params: { id: "10" } }, res);
  assert.equal(res.codigo, 500);
  assert.equal(res.datos.ok, false);
});
