const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { datosAprobacionMultimedia } = require("../build-test/src/helpers/aprobacionMultimedia");
const { errorSolicitudEnfermedad } = require("../build-test/src/helpers/solicitudEnfermedad");

function cargarControlador(estado, vencimiento) {
  let guardado;
  const transaction = {
    commit: async () => {},
    rollback: async () => {},
  };
  const registro = {
    get: () => ({ id: 7, login: "existente", password: "existente" }),
    getDataValue: (campo) => ({ estado, tiempoAprobacion: vencimiento })[campo],
    update: async (datos) => { guardado = { ...datos }; return registro; },
  };
  const dependencias = {
    "../config/config": { development: {} },
    "../helpers/email": async () => {},
    "../helpers/generarPassword": () => "no-utilizada",
    "../helpers/aprobacionMultimedia": { datosAprobacionMultimedia },
    "../helpers/solicitudEnfermedad": { errorSolicitudEnfermedad },
    "../database/connection": { transaction: async () => transaction },
    "../database/usuario.associations": { auditoriaUsuario: async () => {} },
    "../enum/solicitudMultimendia.enum": {
      SOLICITUD_MULTIMEDIA_ENUM: { APROBADA: "APROBADA", PENDIENTE: "PENDIENTE" },
    },
    "../enum/auditoriaUsuario.enum": { AUDITORIAUSUARIO_ENUM: {} },
    "../models/solicitudMultimedia.model": { findByPk: async () => registro },
    "../models/permiso.model": { findOne: async () => null },
    sequelize: { Op: {} },
    bcryptjs: {},
    fs: { readFileSync: () => "" },
    path,
  };
  const archivo = path.join(__dirname, "../src/controllers/solicitudMultimedia.controller.ts");
  const codigo = ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, {
    exports: modulo.exports,
    module: modulo,
    __dirname: path.dirname(archivo),
    process: { env: { NODE_ENV: "development" } },
    console,
    Date,
    require: (nombre) => {
      if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
      if (nombre.startsWith("../models/")) return {};
      throw new Error(`Dependencia no prevista: ${nombre}`);
    },
  });
  return {
    actualizar: modulo.exports.actualizarSolicitudMultimedia,
    crear: modulo.exports.crearSolicitudMultimedia,
    guardado: () => guardado,
  };
}

test("crear rechaza enfermedad sin respuestas o con cuatro No antes de guardar o enviar correos", async () => {
  for (const body of [
    { razonSolicitud_id: 4 },
    {
      razonSolicitud_id: "4", personaEncamada: false, enfermedadCronica: false,
      personaInmunosuprimida: false, impedimentoSalirCasa: false,
    },
  ]) {
    const controlador = cargarControlador("PENDIENTE", null);
    let codigo;
    let respuesta;
    await controlador.crear({ body }, {
      status(valor) { codigo = valor; return this; },
      json(valor) { respuesta = valor; },
    });
    assert.equal(codigo, 400);
    assert.equal(respuesta.ok, false);
    assert.equal(controlador.guardado(), undefined);
  }
});

async function ejecutar(controlador, body) {
  let codigo = 200;
  let respuesta;
  await controlador.actualizar(
    { params: { id: "1" }, body },
    {
      status(valor) { codigo = valor; return this; },
      json(valor) { respuesta = valor; },
    },
  );
  return { codigo, respuesta };
}

test("renovar persiste fecha del servidor y duracion en la misma actualizacion", async () => {
  const anterior = new Date(Date.now() + 86400000);
  const vencimiento = new Date(Date.now() + 30 * 86400000);
  const controlador = cargarControlador("APROBADA", anterior);
  const inicio = Date.now();
  const resultado = await ejecutar(controlador, {
    estado: "APROBADA",
    tiempoAprobacion: vencimiento.toISOString(),
    fechaAprobacion: "2000-01-01",
    duracionAprobadaDias: 999,
  });
  assert.equal(resultado.codigo, 200);
  const datos = controlador.guardado();
  assert.ok(datos.fechaAprobacion.getTime() >= inicio);
  assert.ok(datos.fechaAprobacion.getTime() <= Date.now());
  assert.ok(Math.abs(datos.duracionAprobadaDias - 30) < 0.001);
});

test("editar un historico con el mismo vencimiento no inventa fecha ni duracion", async () => {
  const vencimiento = new Date(Date.now() + 86400000);
  const controlador = cargarControlador("APROBADA", vencimiento);
  assert.equal((await ejecutar(controlador, {
    tiempoAprobacion: vencimiento.toISOString(),
    observaciones: "Edicion",
    fechaAprobacion: "2000-01-01",
    duracionAprobadaDias: 999,
  })).codigo, 200);
  assert.equal(controlador.guardado().fechaAprobacion, undefined);
  assert.equal(controlador.guardado().duracionAprobadaDias, undefined);
});

test("rechaza vencimientos invalidos o pasados sin persistir", async () => {
  for (const tiempoAprobacion of ["invalido", "2000-01-01"]) {
    const controlador = cargarControlador("APROBADA", null);
    const resultado = await ejecutar(controlador, { tiempoAprobacion });
    assert.equal(resultado.codigo, 400);
    assert.equal(controlador.guardado(), undefined);
  }
});
