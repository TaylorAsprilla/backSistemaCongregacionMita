const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { Op } = require("sequelize");

function cargar(entorno = "development") {
  const registro = (datos) => ({ getDataValue: (campo) => datos[campo] });
  const estado = {
    aprobadores: [registro({ id: 7, email: "aprobador@example.invalid" })],
    paises: [registro({ id: 2, pais: "Pais de prueba" })],
    congregaciones: [],
    campos: [],
    pendientes: [registro({
      id: 10,
      primerNombre: "Solicitante",
      email: "solicitante@example.invalid",
      solicitudes: [registro({ id: 20, createdAt: new Date("2026-10-01") })],
    })],
    consultas: [],
    envios: [],
    logs: [],
    errores: [],
    horarios: [],
    falloConsulta: false,
    falloCorreo: false,
  };
  const modelos = {};
  for (const [nombre, clave] of [
    ["pais", "paises"], ["congregacion", "congregaciones"], ["campo", "campos"],
  ]) {
    modelos[`../models/${nombre}.model`] = {
      findAll: async (opciones) => {
        estado.consultas.push({ modelo: nombre, opciones });
        return estado[clave];
      },
    };
  }
  const dependencias = {
    ...modelos,
    sequelize: { Op },
    "node-cron": { schedule: (...args) => estado.horarios.push(args) },
    "../config/config": {
      [entorno]: { imagenEmail: "https://example.invalid/logo.png" },
    },
    "../enum/solicitudMultimendia.enum": {
      SOLICITUD_MULTIMEDIA_ENUM: { PENDIENTE: "PENDIENTE" },
    },
    "../enum/roles.enum": { ROLES_ID: { APROBADOR_MULTIMEDIA: "11" } },
    "../models/usuarioPermiso.model": {},
    "../models/usuarioCongregacion.model": {},
    "../models/solicitudMultimedia.model": {},
    "../models/usuario.model": {
      findAll: async (opciones) => {
        estado.consultas.push({ modelo: "usuario", opciones });
        if (opciones.include[0].as === "usuarioPermiso") return estado.aprobadores;
        if (estado.falloConsulta) throw new Error("Fallo de consulta simulado");
        return estado.pendientes;
      },
    },
    "../helpers/email": async (...args) => {
      estado.envios.push(args);
      if (estado.falloCorreo && estado.envios.length === 1) {
        throw new Error("Rechazo SMTP simulado");
      }
    },
  };
  const archivo = path.join(__dirname, "../src/crons/notifyPendingRequests.ts");
  const codigo = ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, {
    exports: modulo.exports,
    module: modulo,
    __dirname: path.dirname(archivo),
    process: { env: { NODE_ENV: entorno } },
    console: {
      log: (...args) => estado.logs.push(args.join(" ")),
      info: (...args) => estado.logs.push(args.join(" ")),
      error: (...args) => estado.errores.push(args),
    },
    require: (nombre) => {
      if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
      if (nombre === "fs" || nombre === "path") return require(nombre);
      throw new Error(`Dependencia no simulada: ${nombre}`);
    },
  }, { filename: archivo });
  return { estado, registro, ejecutar: modulo.exports.notificarAprobadoresMultimedia };
}

test("notifica por responsabilidad aunque el aprobador no tenga ubicacion personal", async () => {
  const { estado, ejecutar } = cargar();
  await ejecutar();
  assert.equal(estado.envios.length, 1);
  assert.equal(estado.envios[0][0], "aprobador@example.invalid");
  assert.equal(estado.envios[0][4], true);
  assert.match(estado.envios[0][2], /Solicitante/);
  assert.match(estado.envios[0][2], /Pais de prueba/);
  const consulta = estado.consultas.find((c) => c.modelo === "pais").opciones;
  assert.equal(consulta.where.estado, true);
  assert.equal(consulta.where[Op.or][0].idObreroEncargado, 7);
  assert.equal(consulta.where[Op.or][1].idAdministrador, 7);
  const filtro = estado.consultas.at(-1).opciones.include;
  assert.equal(filtro[0].where.estado, "PENDIENTE");
  assert.equal(filtro[0].where.emailVerificado, true);
  assert.equal(filtro[1].where[Op.or][0].pais_id, 2);
});

test("incluye todos los paises, congregaciones y campos en un solo correo", async () => {
  const { estado, registro, ejecutar } = cargar();
  estado.paises.push(registro({ id: 3, pais: "Segundo pais" }));
  estado.congregaciones.push(registro({ id: 4, congregacion: "Congregacion prueba" }));
  estado.campos.push(registro({ id: 5, campo: "Campo prueba" }));
  await ejecutar();
  assert.equal(estado.envios.length, 1);
  const condiciones = estado.consultas.at(-1).opciones.include[1].where[Op.or];
  assert.equal(condiciones.length, 4);
  assert.equal(condiciones[2].congregacion_id, 4);
  assert.equal(condiciones[3].campo_id, 5);
  for (const nombre of ["congregacion", "campo"]) {
    const consulta = estado.consultas.find((c) => c.modelo === nombre).opciones;
    assert.equal(consulta.where[Op.or][1].idObreroEncargadoDos, 7);
  }
});

test("no envia cuando no hay pendientes, congregacion o correo", async () => {
  for (const caso of ["pendientes", "paises", "correo"]) {
    const { estado, registro, ejecutar } = cargar();
    if (caso === "correo") estado.aprobadores = [registro({ id: 7 })];
    else estado[caso] = [];
    await ejecutar();
    assert.equal(estado.envios.length, 0, caso);
  }
});

test("un fallo de consulta se informa como error, no como ausencia de pendientes", async () => {
  const { estado, ejecutar } = cargar();
  estado.falloConsulta = true;
  await assert.rejects(ejecutar, /Falló la notificación de 1/);
  assert.equal(estado.envios.length, 0);
  assert.equal(estado.errores.length, 1);
  assert.ok(!estado.logs.some((log) => log.includes("no tiene solicitudes pendientes")));
  assert.ok(!estado.logs.some((log) => log.includes("completado exitosamente")));
});

test("un fallo SMTP no impide notificar al siguiente aprobador ni se registra como exito", async () => {
  const { estado, registro, ejecutar } = cargar();
  estado.aprobadores.push(registro({ id: 8, email: "segundo@example.invalid" }));
  estado.falloCorreo = true;
  await assert.rejects(ejecutar, /Falló la notificación de 1/);
  assert.equal(estado.envios.length, 2);
  assert.equal(estado.envios[1][0], "segundo@example.invalid");
  assert.equal(estado.logs.filter((log) => log.includes("Email enviado")).length, 1);
  assert.ok(!estado.logs.some((log) => log.includes("completado exitosamente")));
});

test("el cron se programa solo en produccion y registra errores de ejecucion", async () => {
  assert.equal(cargar().estado.horarios.length, 0);
  const { estado } = cargar("production");
  assert.equal(estado.horarios[0][0], "0 9 * * 1");
  estado.falloCorreo = true;
  await estado.horarios[0][1]();
  assert.equal(estado.errores.length, 2);
});
