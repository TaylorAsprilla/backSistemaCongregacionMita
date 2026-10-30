const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function cargar(estado) {
  const modelo = (fila) => fila && ({ getDataValue: (campo) => fila[campo] });
  const deps = {
    sequelize: { Op: { in: Symbol("in") } },
    "./validar-roles": require("../build/src/middlewares/validar-roles"),
    "../models/userSession.model": { findOne: async () => modelo(estado.tipo === "NORMAL" ? { idUsuario: estado.id } : null) },
    "../models/usuario.model": { findOne: async () => estado.activo ? {} : null },
    "../models/usuarioPermiso.model": { findAll: async () => estado.roles.map((id) => modelo({ permiso_id: id })) },
    "../models/permiso.model": { findAll: async () => estado.roles.map((id) => modelo({ id })) },
    "../enum/roles.enum": { ROLES_ID: { ADMINISTRADOR: "1", ASISTENTE_OOTS: "8", COMITE_RECTOR: "13" } },
    "../enum/usuario.enum": { ESTADO_USUARIO_ENUM: { ACTIVO: "ACTIVO" } },
  };
  const archivo = path.join(__dirname, "../src/middlewares/validar-administracion-qr.ts");
  const modulo = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, {
    exports: modulo.exports, module: modulo, console,
    require: (nombre) => {
      if (!(nombre in deps)) throw new Error(nombre);
      return deps[nombre];
    },
  });
  return modulo.exports.default;
}

test("administracion QR solo admite usuarios activos normales con roles existentes", async () => {
  for (const [tipo, activo, roles, permitido] of [
    ["NORMAL", true, ["1"], true],
    ["NORMAL", true, ["8"], true],
    ["NORMAL", true, ["13"], true],
    ["NORMAL", true, ["6"], false],
    ["NORMAL", false, ["1"], false],
    ["QR", true, ["1"], false],
  ]) {
    let status = 200, next = false;
    await cargar({ tipo, activo, roles, id: 7 })({ id: 7, sessionId: "prueba" }, {
      status(codigo) { status = codigo; return this; },
      json() {},
    }, () => { next = true; });
    assert.equal(next, permitido);
    assert.equal(status, permitido ? 200 : 403);
  }
});

test("generacion, lectura y consulta por numero requieren JWT y permiso en backend", () => {
  const rutas = fs.readFileSync(path.join(__dirname, "../src/routes/accesoQR.routes.ts"), "utf8");
  for (const ruta of ["ultimoQr", "listadoAccesos", "generarQr"]) {
    assert.match(rutas, new RegExp(`"/${ruta}", validarJWT, validarAdministracionQr,`));
  }
  const usuarios = fs.readFileSync(path.join(__dirname, "../src/routes/usuario.routes.ts"), "utf8");
  assert.match(usuarios, /"\/buscarnumeromita", validarJWT, validarAdministracionQr,/);
  assert.match(rutas, /"\/solicitarCodigo", rateLimiter/);
  assert.match(rutas, /"\/loginQr", rateLimiter/);
});
