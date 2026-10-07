const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const autorizacion = require("../build/src/services/supervisionPais.authorization");
const Informe = require("../build/src/models/informe.model").default;
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
