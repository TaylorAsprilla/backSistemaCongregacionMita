const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const ts = require("typescript");
const reales = require("../build-test/src/helpers/accesoQr");

function cargar() {
  const estado = {
    desafios: [], auditoria: [], sesiones: [], envios: [],
    activo: true, qrActivo: true, falloCorreo: false, falloAuditoria: false, falloInvalidacion: false,
    qrActualizaciones: [], qrCreados: [],
    ubicaciones: [], consultasUbicacion: [],
  };
  const op = require("sequelize").Op;
  const modelo = (fila) => fila && ({
    getDataValue: (campo) => fila[campo],
    toJSON: () => ({ ...fila }),
    update: async (datos) => Object.assign(fila, datos),
    increment: async (campo) => { fila[campo]++; },
  });
  let cola = Promise.resolve();
  const db = { transaction: async (fn) => {
    const previa = cola;
    let liberar;
    cola = new Promise((resolver) => { liberar = resolver; });
    await previa;
    const copia = {
      desafios: estado.desafios.map((d) => ({ ...d })),
      auditoria: [...estado.auditoria], sesiones: [...estado.sesiones],
    };
    try { return await fn({ LOCK: { UPDATE: "UPDATE" } }); }
    catch (error) { Object.assign(estado, copia); throw error; }
    finally { liberar(); }
  } };
  const usuario = {
    id: 7, estado: "ACTIVO", email: "solo-pruebas@example.invalid",
    primerNombre: "Prueba", primerApellido: "QR",
  };
  const congregacion = { id: 4, estado: true, congregacion: "Prueba", email: "qr@example.invalid" };
  const codigoQr = { id: 2, idCongregacion: 4, qrCode: "QR-PRUEBA", activo: true };
  const dependencias = {
    "../config/config": { development: { imagenEmail: "https://example.invalid/logo.png" } },
    "../database/connection": db,
    "../models/usuario.model": { findOne: async ({ where }) =>
      modelo(estado.activo && where.id === 7 ? usuario : null) },
    "../models/congregacion.model": { findOne: async () => modelo(congregacion) },
    "../models/qrCodigos.model": {
      findOne: async ({ where }) =>
        modelo(estado.qrActivo && (!where || where.qrCode === codigoQr.qrCode) ? codigoQr : null),
      update: async (...datos) => { estado.qrActualizaciones.push(datos); },
      create: async (datos) => { estado.qrCreados.push(datos); },
    },
    "../models/desafioAccesoQr.model": {
      count: async ({ where }) => estado.desafios.filter((d) =>
        d.idUsuario === where.idUsuario && d.createdAt >= where.createdAt[op.gte]).length,
      create: async (datos) => {
        const fila = { intentosFallidos: 0, fechaConsumo: null, createdAt: new Date(), ...datos };
        estado.desafios.push(fila); return modelo(fila);
      },
      findByPk: async (id, opciones) => {
        assert.equal(opciones.lock, "UPDATE");
        return modelo(estado.desafios.find((d) => d.id === id));
      },
      update: async (datos, { where }) => {
        if (estado.falloInvalidacion) throw new Error("Fallo de invalidacion simulado");
        return Object.assign(estado.desafios.find((d) => d.id === where.id), datos);
      },
    },
    "../models/qrAccesos": {
      create: async (datos) => {
        if (estado.falloAuditoria) throw new Error("Fallo de auditoria simulado");
        estado.auditoria.push(datos);
      },
      findAndCountAll: async (opciones) => {
        estado.consultaHistorial = opciones;
        return { count: estado.auditoria.length, rows: estado.auditoria.map(modelo) };
      },
    },
    "../models/ubicacionConexion.model": {
      findOne: async (opciones) => {
        estado.consultasUbicacion.push(opciones);
        return modelo(estado.ubicaciones.find((fila) => fila.ip === opciones.where.ip));
      },
    },
    "../helpers/email": async (...args) => {
      if (estado.falloCorreo) throw new Error("Fallo SMTP simulado");
      estado.envios.push(args);
    },
    "../helpers/accesoQr": {
      ...reales,
      resumirCodigoQr: (id, codigo) => `${id}:${codigo}`,
      verificarCodigoQr: (id, codigo, resumen) => resumen === `${id}:${codigo}`,
    },
    "../helpers/session.service": { createQrSession: async (datos) => {
      assert.ok(datos.transaction);
      estado.sesiones.push(datos);
      return { sessionId: randomUUID() };
    } },
    "../helpers/tokenJwt": async (...args) => { estado.jwt = args; return "jwt-de-prueba"; },
    "../helpers/guardarInformacionConexion": { guardarInformacionConexion: async () => {} },
    "../enum/usuario.enum": { ESTADO_USUARIO_ENUM: { ACTIVO: "ACTIVO" } },
    sequelize: require("sequelize"),
    uuid: { v4: randomUUID },
    "device-detector-js": class { parse() { return {}; } },
    qrcode: require("qrcode"), sharp: require("sharp"), path, fs,
  };
  const archivo = path.join(__dirname, "../src/controllers/accesoQR.controller.ts");
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2016, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(codigo, {
    exports: modulo.exports, module: modulo, process: { env: { NODE_ENV: "development" } },
    console: { error() {}, info() {} }, Date, __dirname: path.dirname(archivo),
    require: (nombre) => {
      if (!(nombre in dependencias)) throw new Error(`Dependencia no prevista: ${nombre}`);
      return dependencias[nombre];
    },
  });
  const ejecutar = async (accion, body = {}, query = {}) => {
    let status = 200, respuesta;
    await modulo.exports[accion]({
      body, query, ip: "127.0.0.1", socket: {}, get: () => "Prueba",
    }, {
      status(codigo) { status = codigo; return this; },
      json(datos) { respuesta = datos; return this; },
    });
    return { status, respuesta };
  };
  const solicitar = async (numeroMita = "7") => ejecutar("solicitarCodigoQr", { qrCode: "QR-PRUEBA", numeroMita });
  const datosLogin = () => ({
    qrCode: "QR-PRUEBA", desafio_id: estado.desafios[0].id,
    codigo: estado.envios[0][2].match(/<strong>(\d{6})<\/strong>/)[1],
    esGuarda: false, esCuidadora: false, enTurnoGuarda: false, puesto: null,
  });
  return { estado, ejecutar, solicitar, datosLogin };
}

test("generar QR usa logo local y produce PNG sin dependencia HTTP", async () => {
  const c = cargar();
  const resultado = await c.ejecutar("generarQrCode", { idCongregacion: 5, descripcion: "Prueba local" });
  assert.equal(resultado.status, 200);
  assert.equal(resultado.respuesta.ok, true);
  const imagen = await require("sharp")(Buffer.from(resultado.respuesta.qrImage, "base64")).metadata();
  assert.equal(imagen.format, "png");
  assert.equal(imagen.width, 800);
  assert.equal(imagen.height, 800);
  assert.equal(c.estado.qrCreados.length, 1);
  assert.equal(c.estado.qrCreados[0].idCongregacion, 5);
  assert.equal(c.estado.qrActualizaciones.length, 1);
});

test("consultar ultimo QR tambien genera su imagen con el logo local", async () => {
  const c = cargar();
  const resultado = await c.ejecutar("getUltimoQrGenerado");
  assert.equal(resultado.status, 200);
  assert.equal(resultado.respuesta.ok, true);
  const imagen = await require("sharp")(Buffer.from(resultado.respuesta.qrImage, "base64")).metadata();
  assert.equal(imagen.format, "png");
  assert.equal(imagen.width, 800);
  assert.equal(c.estado.qrCreados.length, 0);
  assert.equal(c.estado.qrActualizaciones.length, 0);
});

test("OTP no revela usuario ni correo y no emite una sesion al solicitarlo", async () => {
  const c = cargar();
  const valida = await c.solicitar();
  const desconocida = await c.solicitar("8");
  assert.equal(valida.status, 200);
  assert.equal(desconocida.status, 200);
  assert.deepEqual(Object.keys(valida.respuesta), Object.keys(desconocida.respuesta));
  assert.equal(valida.respuesta.msg, desconocida.respuesta.msg);
  assert.equal(c.estado.envios.length, 1);
  assert.equal(c.estado.envios[0][4], true);
  const html = c.estado.envios[0][2];
  assert.ok(html.includes('src="https://example.invalid/logo.png"'));
  assert.ok(html.includes("Congregación Mita, Inc."));
  assert.ok(html.includes("3 códigos cada 15 minutos"));
  assert.ok(html.includes("<b>4 horas</b>"));
  assert.ok(html.includes("<b>10 minutos</b>"));
  assert.ok(!html.includes("{{"));
  assert.equal(c.estado.sesiones.length, 0);
});

test("fallo al invalidar un desafio no deja la respuesta HTTP pendiente", async () => {
  const c = cargar(); c.estado.falloCorreo = true; c.estado.falloInvalidacion = true;
  assert.equal((await c.solicitar()).status, 503);
  assert.equal(c.estado.sesiones.length, 0);
});

test("usuario inactivo o con tres solicitudes no obtiene nuevos codigos", async () => {
  const c = cargar();
  await Promise.all([c.solicitar(), c.solicitar(), c.solicitar(), c.solicitar()]);
  assert.equal(c.estado.envios.length, 3);
  c.estado.activo = false;
  await c.solicitar();
  assert.equal(c.estado.envios.length, 3);
});

test("correo fallido invalida el desafio y devuelve error explicito", async () => {
  const c = cargar(); c.estado.falloCorreo = true;
  assert.equal((await c.solicitar()).status, 503);
  assert.ok(c.estado.desafios[0].fechaConsumo);
  assert.equal(c.estado.sesiones.length, 0);
  assert.ok(c.estado.auditoria.some((a) => a.motivoRechazo === "ENVIO_NO_DISPONIBLE"));
});

test("codigo verificado se consume una vez y crea sesion de cuatro horas", async () => {
  const c = cargar(); await c.solicitar();
  const datos = c.datosLogin(), inicio = Date.now();
  const resultados = await Promise.all([
    c.ejecutar("loginPorQr", datos), c.ejecutar("loginPorQr", datos),
  ]);
  assert.deepEqual(resultados.map((r) => r.status).sort(), [200, 401]);
  assert.equal(c.estado.sesiones.length, 1);
  assert.equal(c.estado.sesiones[0].idUsuario, 7);
  assert.ok(c.estado.sesiones[0].expiresAt.getTime() >= inicio + 4 * 3600000);
  assert.ok(c.estado.sesiones[0].expiresAt.getTime() <= Date.now() + 4 * 3600000);
  assert.equal(c.estado.jwt[4], "4h");
  assert.ok(c.estado.desafios[0].fechaConsumo);
  assert.equal(c.estado.auditoria.find((a) => a.resultado === "EXITOSO").nombre, "Prueba QR");
});

test("caducidad, QR inactivo, otra identidad y cinco fallos impiden ingresar", async () => {
  for (const caso of ["caducado", "qr", "usuario", "intentos"]) {
    const c = cargar(); await c.solicitar();
    const datos = c.datosLogin();
    if (caso === "caducado") c.estado.desafios[0].fechaExpiracion = new Date(0);
    if (caso === "qr") c.estado.qrActivo = false;
    if (caso === "usuario") c.estado.activo = false;
    if (caso === "intentos") {
      for (let i = 0; i < 5; i++) {
        await c.ejecutar("loginPorQr", { ...datos, codigo: datos.codigo === "000000" ? "999999" : "000000" });
      }
      assert.equal(c.estado.desafios[0].intentosFallidos, 5);
    }
    assert.equal((await c.ejecutar("loginPorQr", datos)).status, 401, caso);
    assert.equal(c.estado.sesiones.length, 0);
  }
});

test("puesto es obligatorio solo para guarda en turno y se audita", async () => {
  const c = cargar(); await c.solicitar();
  const datos = { ...c.datosLogin(), esGuarda: true, enTurnoGuarda: true };
  assert.equal((await c.ejecutar("loginPorQr", datos)).status, 400);
  assert.equal((await c.ejecutar("loginPorQr", { ...datos, puesto: "Otro" })).status, 400);
  assert.equal((await c.ejecutar("loginPorQr", { ...datos, puesto: "Casa Nueva" })).status, 200);
  assert.equal(c.estado.auditoria.at(-1).puesto, "Casa Nueva");
});

test("cuidadora puede ingresar y su respuesta queda en la auditoría", async () => {
  const c = cargar(); await c.solicitar();
  const datos = { ...c.datosLogin(), esCuidadora: true };
  assert.equal((await c.ejecutar("loginPorQr", datos)).status, 200);
  assert.equal(c.estado.auditoria.at(-1).esGuarda, false);
  assert.equal(c.estado.auditoria.at(-1).esCuidadora, true);
});

test("no acepta que la persona indique ser guarda y cuidadora a la vez", async () => {
  const c = cargar(); await c.solicitar();
  const datos = { ...c.datosLogin(), esGuarda: true, esCuidadora: true };
  assert.equal((await c.ejecutar("loginPorQr", datos)).status, 400);
  assert.equal(c.estado.sesiones.length, 0);
});

test("vencido y utilizado muestran mensajes distintos sin crear sesiones", async () => {
  for (const [campo, valor, code, texto] of [
    ["fechaExpiracion", new Date(0), "CODIGO_VENCIDO", "venció"],
    ["fechaConsumo", new Date(), "CODIGO_UTILIZADO", "ya fue utilizado"],
  ]) {
    const c = cargar(); await c.solicitar();
    c.estado.desafios[0][campo] = valor;
    const resultado = await c.ejecutar("loginPorQr", c.datosLogin());
    assert.equal(resultado.status, 401);
    assert.equal(resultado.respuesta.code, code);
    assert.ok(resultado.respuesta.msg.includes(texto));
    assert.ok(resultado.respuesta.msg.includes("Solicitar otro código / cambiar número"));
    assert.equal(c.estado.auditoria.at(-1).motivoRechazo, code);
    assert.equal(c.estado.sesiones.length, 0);
    assert.equal(c.estado.desafios[0].intentosFallidos, 0);
  }
});

test("codigo incorrecto indica intentos restantes y el quinto fallo informa bloqueo inmediato", async () => {
  const c = cargar(); await c.solicitar();
  const datos = c.datosLogin();
  const incorrecto = { ...datos, codigo: datos.codigo === "000000" ? "999999" : "000000" };
  for (let i = 1; i <= 5; i++) {
    const resultado = await c.ejecutar("loginPorQr", incorrecto);
    assert.equal(resultado.status, 401);
    assert.equal(resultado.respuesta.code, i === 5 ? "CODIGO_BLOQUEADO" : "CODIGO_NO_VALIDO");
    assert.ok(resultado.respuesta.msg.includes(i === 5 ? "bloqueado" : `Intentos restantes: ${5 - i}`));
  }
  assert.equal((await c.ejecutar("loginPorQr", datos)).respuesta.code, "CODIGO_BLOQUEADO");
  assert.equal(c.estado.sesiones.length, 0);
});

test("desafio desconocido o de otro QR no revela su estado", async () => {
  const c = cargar(); await c.solicitar();
  const datos = c.datosLogin();
  c.estado.desafios[0].fechaConsumo = new Date();
  c.estado.desafios[0].idQrCode = 999;
  assert.equal((await c.ejecutar("loginPorQr", datos)).respuesta.code, "DESAFIO_NO_DISPONIBLE");
  assert.equal((await c.ejecutar("loginPorQr", { ...datos, desafio_id: randomUUID() })).respuesta.code, "DESAFIO_NO_DISPONIBLE");
});

test("guarda fuera de turno se rechaza sin sesion ni consumo y no guarda puede continuar", async () => {
  const c = cargar(); await c.solicitar();
  const datos = c.datosLogin();
  const rechazo = await c.ejecutar("loginPorQr", { ...datos, esGuarda: true, enTurnoGuarda: false });
  assert.equal(rechazo.status, 403);
  assert.ok(rechazo.respuesta.msg.includes("debe estar actualmente en turno"));
  assert.equal(c.estado.sesiones.length, 0);
  assert.equal(c.estado.desafios[0].fechaConsumo, null);
  assert.equal(c.estado.desafios[0].intentosFallidos, 0);
  assert.equal(c.estado.auditoria.at(-1).motivoRechazo, "GUARDA_FUERA_DE_TURNO");
  assert.equal((await c.ejecutar("loginPorQr", datos)).status, 200);
});

test("sin auditoria no se persiste sesion ni se consume el codigo", async () => {
  const c = cargar(); await c.solicitar();
  c.estado.falloAuditoria = true;
  assert.equal((await c.ejecutar("loginPorQr", c.datosLogin())).status, 500);
  assert.equal(c.estado.sesiones.length, 0);
  assert.equal(c.estado.desafios[0].fechaConsumo, null);
});

test("historial usa registros QR directos, valida filtros y conserva nulos historicos", async () => {
  const c = cargar();
  assert.equal((await c.ejecutar("getQrAccesos", {}, {
    esGuarda: "true", esCuidadora: "false", puesto: "Casa Nueva",
  })).status, 200);
  assert.equal(c.estado.consultaHistorial.where.esGuarda, true);
  assert.equal(c.estado.consultaHistorial.where.esCuidadora, false);
  assert.equal(c.estado.consultaHistorial.replacements.puesto, "%Casa Nueva%");
  assert.equal((await c.ejecutar("getQrAccesos", {}, { esGuarda: "incorrecto" })).status, 400);
  assert.equal((await c.ejecutar("getQrAccesos", {}, { esCuidadora: "incorrecto" })).status, 400);
  assert.equal((await c.ejecutar("getQrAccesos", {}, { page: "-1" })).status, 400);
});

test("combina filtros de todas las columnas antes de paginar y usa parametros de texto", async () => {
  const c = cargar();
  const { status, respuesta } = await c.ejecutar("getQrAccesos", {}, {
    page: "2", limit: "20", usuario: "#12.345", dispositivo: "Android",
    ubicacion: "Ciudad", accesoDe: "guarda", puesto: "Casa Nueva",
    resultado: "RECHAZADO", identidad: "NO_VERIFICADA", motivoRechazo: "CODIGO_%",
    fechaDesde: "2026-10-01T04:00:00.000Z", fechaHasta: "2026-11-01T04:00:00.000Z",
  });
  assert.equal(status, 200);
  const { Op, Sequelize } = require("sequelize");
  const opciones = c.estado.consultaHistorial;
  assert.equal(opciones.offset, 20);
  assert.equal(opciones.limit, 20);
  assert.equal(respuesta.pagination.page, 2);
  assert.equal(opciones.replacements.usuario, "%#12.345%");
  assert.equal(opciones.replacements.motivoRechazo, "%CODIGO!_!%%");
  const condiciones = opciones.where[Op.and];
  assert.equal(condiciones[0][Op.or][1].idUsuario, 12345);
  assert.ok(condiciones.some((filtro) => filtro.esGuarda === true));
  assert.ok(condiciones.some((filtro) => filtro.resultado === "RECHAZADO"));
  assert.ok(condiciones.some((filtro) => filtro.resultadoIdentidad === "NO_VERIFICADA"));
  assert.ok(condiciones.some((filtro) => filtro.createdAt?.[Op.gte]?.toISOString() === "2026-10-01T04:00:00.000Z"));
  assert.ok(condiciones.some((filtro) => filtro.createdAt?.[Op.lt]?.toISOString() === "2026-11-01T04:00:00.000Z"));
  const db = new Sequelize("prueba", "prueba", "prueba", { dialect: "mysql", logging: false });
  const modelo = db.define("QrAccesos", {}, { tableName: "qrAccesos" });
  const sql = db.getQueryInterface().queryGenerator.selectQuery("qrAccesos", { ...opciones }, modelo);
  assert.match(sql, /FROM `qrAccesos` AS `QrAccesos`/);
  assert.match(sql, /FROM ubicacionConexion u WHERE u.ip = `QrAccesos`.`ip`/);
  assert.match(sql, /ORDER BY u.createdAt DESC, u.id DESC LIMIT 1/);
  assert.match(sql, /NULLIF\(`QrAccesos`.`tipoPuesto`, ''\)/);
  assert.match(sql, /LIKE :ubicacion ESCAPE '!'/);
  assert.match(sql, /LIMIT 20, 20/);
});

test("acepta todos los tipos de acceso y los estados sin registro", async () => {
  const { Op } = require("sequelize");
  for (const accesoDe of ["guarda", "cuidadora", "otro", "sin_registro"]) {
    const c = cargar();
    assert.equal((await c.ejecutar("getQrAccesos", {}, { accesoDe })).status, 200);
    const condicion = c.estado.consultaHistorial.where[Op.and][0];
    if (accesoDe === "guarda") assert.equal(condicion.esGuarda, true);
    if (accesoDe === "cuidadora") assert.equal(condicion.esCuidadora, true);
    if (accesoDe === "otro") {
      assert.equal(condicion.esGuarda, false);
      assert.equal(condicion.esCuidadora, false);
    }
    if (accesoDe === "sin_registro") assert.equal(condicion[Op.or].length, 2);
  }
  const c = cargar();
  assert.equal((await c.ejecutar("getQrAccesos", {}, { resultado: "HISTORICO", identidad: "SIN_REGISTRO" })).status, 200);
  const condiciones = c.estado.consultaHistorial.where[Op.and];
  assert.deepEqual(Array.from(condiciones[0].resultado[Op.or]), [null, ""]);
  assert.deepEqual(Array.from(condiciones[1].resultadoIdentidad[Op.or]), [null, ""]);
});

test("valida tipos, longitudes, opciones y fechas de los filtros", async () => {
  const invalidos = [
    { usuario: ["Prueba"] }, { dispositivo: { contiene: "Android" } }, { ubicacion: " " },
    { puesto: "x".repeat(151) }, { motivoRechazo: ["DATOS_INVALIDOS"] },
    { accesoDe: "administrador" }, { resultado: ["EXITOSO"] }, { identidad: "OTRA" },
    { esGuarda: ["true"] }, { esCuidadora: ["false"] },
    { fechaDesde: "2026-02-30T00:00:00.000Z" }, { fechaHasta: "ayer" },
    { fechaDesde: "2026-11-01T00:00:00.000Z", fechaHasta: "2026-10-01T00:00:00.000Z" },
  ];
  for (const filtros of invalidos) {
    const c = cargar();
    assert.equal((await c.ejecutar("getQrAccesos", {}, filtros)).status, 400, JSON.stringify(filtros));
    assert.equal(c.estado.consultaHistorial, undefined);
  }
});

test("historial agrega ciudad y pais registrados por IP sin alterar total ni duplicar consultas", async () => {
  const c = cargar();
  c.estado.auditoria.push(
    { id: 1, ip: "192.0.2.1", esGuarda: null },
    { id: 2, ip: "192.0.2.1", esCuidadora: true },
    { id: 3, ip: "192.0.2.2" },
    { id: 4, ip: null },
  );
  c.estado.ubicaciones.push({ ip: "192.0.2.1", ciudad: "Ciudad de prueba", pais: "Pais de prueba" });
  const { status, respuesta } = await c.ejecutar("getQrAccesos");
  assert.equal(status, 200);
  assert.equal(respuesta.pagination.total, 4);
  assert.equal(respuesta.data.length, 4);
  assert.equal(respuesta.data[0].ubicacion.ciudad, "Ciudad de prueba");
  assert.equal(respuesta.data[0].ubicacion.pais, "Pais de prueba");
  assert.equal(respuesta.data[0].esGuarda, null);
  assert.equal(respuesta.data[1].esCuidadora, true);
  assert.equal(respuesta.data[2].ubicacion, null);
  assert.equal(respuesta.data[3].ubicacion, null);
  assert.equal(c.estado.consultasUbicacion.length, 2);
  assert.deepEqual(Array.from(c.estado.consultasUbicacion[0].order, (orden) => Array.from(orden)),
    [["createdAt", "DESC"], ["id", "DESC"]]);
});
