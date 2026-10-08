const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const autorizacion = require("../build/src/services/supervisionPais.authorization");
const Informe = require("../build/src/models/informe.model").default;
const Congregacion = require("../build/src/models/congregacion.model").default;
const Campo = require("../build/src/models/campo.model").default;
const UsuarioCongregacion = require("../build/src/models/usuarioCongregacion.model").default;
const Pais = require("../build/src/models/pais.model").default;
const consultas = require("../build/src/services/dashboardSupervision/consultas");
const { obtenerInformeAutorizado } = require("../build/src/helpers/informe-autorizado");

test("Obrero País puede leer sus informes y los de su alcance, no los ajenos", async () => {
  const originalContexto = autorizacion.obtenerContextoObreroPais;
  const originalAsignados = autorizacion.obtenerObrerosAsignadosAlPais;
  const originalFindOne = Informe.findOne;
  try {
    autorizacion.obtenerContextoObreroPais = async () => ({ paises: [2] });
    autorizacion.obtenerObrerosAsignadosAlPais = async () => [7];
    let propietario = 77;
    Informe.findOne = async ({ where }) =>
      where.usuario_id[Op.in].includes(propietario) ? { id: 18, usuario_id: propietario } : null;
    assert.ok(await obtenerInformeAutorizado({ id: 77 }, "18"));
    propietario = 7;
    assert.ok(await obtenerInformeAutorizado({ id: 77 }, "18"));
    propietario = 99;
    assert.equal(await obtenerInformeAutorizado({ id: 77 }, "18"), null);
    autorizacion.obtenerObrerosAsignadosAlPais = async () => [];
    propietario = 77;
    assert.ok(await obtenerInformeAutorizado({ id: 77 }, "18"));
    assert.equal(await obtenerInformeAutorizado({}, "18"), null);
    autorizacion.obtenerContextoObreroPais = async () => null;
    propietario = 7;
    assert.equal(await obtenerInformeAutorizado({ id: 77 }, "18"), null);
  } finally {
    autorizacion.obtenerContextoObreroPais = originalContexto;
    autorizacion.obtenerObrerosAsignadosAlPais = originalAsignados;
    Informe.findOne = originalFindOne;
  }
});

test("El alcance del país incluye usuarios asignados a congregaciones y campos del país", async () => {
  const originalCongregacionFindAll = Congregacion.findAll;
  const originalCampoFindAll = Campo.findAll;
  const originalUsuarioCongregacionFindAll = UsuarioCongregacion.findAll;
  try {
    let filtroAsignaciones;
    Congregacion.findAll = async () => [{
      getDataValue: (field) => ({
        id: 20,
        idObreroEncargado: 51,
        idObreroEncargadoDos: null,
      })[field],
    }];
    Campo.findAll = async () => [{
      getDataValue: (field) => ({
        id: 30,
        idObreroEncargado: null,
        idObreroEncargadoDos: 52,
      })[field],
    }];
    UsuarioCongregacion.findAll = async ({ where }) => {
      filtroAsignaciones = where;
      return [41, 42].map((usuario_id) => ({
        getDataValue: () => usuario_id,
      }));
    };

    const usuarios = await autorizacion.obtenerObrerosAsignadosAlPais([2]);
    assert.deepEqual(new Set(usuarios), new Set([41, 42, 51, 52]));
    assert.deepEqual(filtroAsignaciones[Op.or], [
      { pais_id: { [Op.in]: [2] } },
      { congregacion_id: { [Op.in]: [20] } },
      { campo_id: { [Op.in]: [30] } },
    ]);
  } finally {
    Congregacion.findAll = originalCongregacionFindAll;
    Campo.findAll = originalCampoFindAll;
    UsuarioCongregacion.findAll = originalUsuarioCongregacionFindAll;
  }
});

test("El obrero 2182 de Colombia puede leer los informes 36, 55 y 74 por la asignacion de sus propietarios", async (t) => {
  const fila = (datos) => ({ getDataValue: (campo) => datos[campo] });
  t.mock.method(consultas, "obtenerPermisosUsuario", async (id) => {
    assert.equal(id, 2182);
    return ["2"];
  });
  t.mock.method(consultas, "obtenerNombresPermisosUsuario", async () => []);
  t.mock.method(Pais, "findAll", async ({ where }) => {
    assert.deepEqual(where, { idObreroEncargado: 2182, estado: true });
    return [fila({ id: 2 })];
  });
  t.mock.method(Congregacion, "findAll", async ({ where }) => {
    assert.deepEqual(where, { pais_id: { [Op.in]: [2] }, estado: true });
    return [
      fila({ id: 43, idObreroEncargado: 3419 }),
      fila({ id: 40, idObreroEncargado: 2593 }),
      fila({ id: 5, idObreroEncargado: 3559, idObreroEncargadoDos: 56 }),
    ];
  });
  t.mock.method(Campo, "findAll", async () => [fila({ id: 139 })]);
  t.mock.method(UsuarioCongregacion, "findAll", async ({ where }) => {
    const asignaciones = [
      { usuario_id: 2281, pais_id: 2, congregacion_id: 43, campo_id: 1 },
      { usuario_id: 2593, pais_id: 2, congregacion_id: 40, campo_id: 1 },
      { usuario_id: 2087, pais_id: 2, congregacion_id: 5, campo_id: 139 },
      { usuario_id: 9999, pais_id: 3, congregacion_id: 99, campo_id: 999 },
    ];
    return asignaciones.filter((asignacion) =>
      where[Op.or].some((condicion) =>
        Object.entries(condicion).every(([campo, filtro]) =>
          filtro[Op.in].includes(asignacion[campo]),
        ),
      ),
    ).map(fila);
  });
  const propietarios = { 36: 2281, 55: 2593, 74: 2087, 99: 9999 };
  t.mock.method(Informe, "findOne", async ({ where }) => {
    const propietario = propietarios[where.id];
    return where.usuario_id[Op.in].includes(propietario)
      ? { id: Number(where.id), usuario_id: propietario }
      : null;
  });
  const advertencias = t.mock.method(console, "warn", () => {});

  for (const id of ["36", "55", "74"]) {
    assert.deepEqual(await obtenerInformeAutorizado({ id: 2182 }, id), {
      id: Number(id),
      usuario_id: propietarios[id],
    });
  }
  assert.equal(advertencias.mock.callCount(), 0);
  assert.equal(await obtenerInformeAutorizado({ id: 2182 }, "99"), null);
  assert.equal(advertencias.mock.callCount(), 1);
  assert.deepEqual(advertencias.mock.calls[0].arguments, [
    "[INFORME_AUTH] DENEGADO",
    {
      usuarioId: 2182,
      informeId: "99",
      esObreroPais: true,
      paises: [2],
      totalUsuariosAutorizados: 7,
    },
  ]);
});
