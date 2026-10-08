const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const autorizacion = require("../build/src/services/supervisionPais.authorization");
const Informe = require("../build/src/models/informe.model").default;
const Congregacion = require("../build/src/models/congregacion.model").default;
const Campo = require("../build/src/models/campo.model").default;
const UsuarioCongregacion = require("../build/src/models/usuarioCongregacion.model").default;
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
