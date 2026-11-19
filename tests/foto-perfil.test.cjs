const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const sharp = require("sharp");

function cargarModulo(rutaRelativa, dependencias, entorno = {}) {
  const archivo = path.join(__dirname, "..", rutaRelativa);
  const codigo = ts.transpileModule(fs.readFileSync(archivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, {
    exports: modulo.exports,
    module: modulo,
    Buffer,
    console,
    process: { env: entorno },
    require: (nombre) => {
      if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
      throw new Error(`Dependencia no prevista: ${nombre}`);
    },
  });
  return modulo.exports;
}

const helper = cargarModulo("src/helpers/fotoPerfil.ts", {
  crypto: require("node:crypto"),
  sharp,
});

async function imagen(formato, ancho = 600, alto = 600, extra = {}) {
  let s = sharp({
    create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 30, b: 30 } },
  });
  if (extra.exif) s = s.withMetadata({ orientation: extra.exif });
  return s[formato]().toBuffer();
}

async function rechazo(promesa) {
  try {
    await promesa;
  } catch (e) {
    return e;
  }
  assert.fail("Se esperaba un rechazo");
}

// ---------------------------------------------------------------- Helper

test("acepta JPG, PNG y WEBP y los normaliza a WebP 512x512 sin EXIF", async () => {
  for (const formato of ["jpeg", "png", "webp"]) {
    const salida = await helper.procesarFotoPerfil(await imagen(formato, 800, 600));
    const meta = await sharp(salida).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 512);
    assert.equal(meta.exif, undefined);
  }
});

test("rechaza archivos de más de 5 MB", async () => {
  const e = await rechazo(helper.procesarFotoPerfil(Buffer.alloc(5 * 1024 * 1024 + 1)));
  assert.equal(e.code, "IMAGEN_MUY_GRANDE");
});

test("rechaza formato no permitido aunque sea una imagen real (GIF)", async () => {
  const gif = await sharp({
    create: { width: 300, height: 300, channels: 3, background: "#fff" },
  }).gif().toBuffer();
  const e = await rechazo(helper.procesarFotoPerfil(gif));
  assert.equal(e.code, "FORMATO_NO_PERMITIDO");
});

test("rechaza contenido que no es imagen aunque se haya nombrado .jpg", async () => {
  const e = await rechazo(helper.procesarFotoPerfil(Buffer.from("<?php echo 1; ?> falso.jpg")));
  assert.equal(e.code, "IMAGEN_CORRUPTA");
});

test("rechaza imagen truncada/corrupta", async () => {
  const valida = await imagen("png", 400, 400);
  const e = await rechazo(helper.procesarFotoPerfil(valida.subarray(0, 40)));
  assert.equal(e.code, "IMAGEN_CORRUPTA");
});

test("rechaza imágenes menores a 200x200 y cuerpos vacíos", async () => {
  let e = await rechazo(helper.procesarFotoPerfil(await imagen("png", 150, 400)));
  assert.equal(e.code, "IMAGEN_MUY_PEQUENA");
  e = await rechazo(helper.procesarFotoPerfil({}));
  assert.equal(e.code, "IMAGEN_VACIA");
  e = await rechazo(helper.procesarFotoPerfil(Buffer.alloc(0)));
  assert.equal(e.code, "IMAGEN_VACIA");
});

test("claves: prefijo por usuario, únicas y verificación de propiedad", () => {
  const a = helper.generarClaveFotoPerfil(7);
  const b = helper.generarClaveFotoPerfil(7);
  assert.match(a, /^usuarios\/fotos-perfil\/7\/[0-9a-f-]{36}\.webp$/);
  assert.notEqual(a, b);
  assert.equal(helper.esClaveFotoDeUsuario(a, 7), true);
  assert.equal(helper.esClaveFotoDeUsuario(a, 8), false);
  assert.equal(helper.esClaveFotoDeUsuario("legacy.png", 7), false);
  assert.equal(helper.esClaveFotoDeUsuario("usuarios/fotos-perfil/7/../8/x.webp", 7), false);
  assert.equal(helper.esClaveFotoDeUsuario(null, 7), false);
});

// ------------------------------------------------------------ Controlador

function entornoControlador({ fotoActual = null, fallaS3 = false, fallaBD = false, truncaA = 0 } = {}) {
  const estado = { foto: fotoActual, guardados: [], eliminados: [], consultas: [] };
  const registro = {
    getDataValue: (c) => (c === "foto" ? estado.foto : 7),
    update: async (datos) => {
      if (fallaBD) throw new Error("MySQL caído");
      // Simula una columna VARCHAR corta que trunca sin error.
      estado.foto = truncaA ? datos.foto.slice(0, truncaA) : datos.foto;
    },
    reload: async () => {},
  };
  const storage = {
    guardar: async (clave) => {
      if (fallaS3) throw new Error("S3 caído");
      estado.guardados.push(clave);
    },
    eliminar: async (clave) => estado.eliminados.push(clave),
    urlFirmada: async (clave) => `https://s3.test/${clave}?firma`,
  };
  const Usuario = {
    findByPk: async (id) => (id === 7 ? registro : null),
    findAll: async (opciones) => {
      estado.consultas.push(opciones);
      return [
        { getDataValue: (c) => (c === "id" ? 7 : "usuarios/fotos-perfil/7/a.webp") },
        { getDataValue: (c) => (c === "id" ? 8 : "foto-heredada.png") },
        { getDataValue: (c) => (c === "id" ? 9 : "usuarios/fotos-perfil/7/robada.webp") },
      ];
    },
  };
  const controlador = cargarModulo("src/controllers/fotoPerfil.controller.ts", {
    sequelize: { Op: { in: "in", ne: "ne" } },
    "../models/usuario.model": Usuario,
    "../middlewares/validar-jwt": {},
    "../helpers/fotoPerfil": helper,
    "../services/fotoPerfilStorage": {
      getFotoPerfilStorage: () => storage,
      ttlUrlFoto: () => 900,
    },
  });
  return { controlador, estado };
}

function respuesta() {
  const r = { codigo: 200, cuerpo: undefined };
  r.status = (c) => ((r.codigo = c), r);
  r.json = (b) => ((r.cuerpo = b), r);
  return r;
}

const peticion = (extra = {}) => ({ id: 7, sessionType: "NORMAL", body: undefined, ...extra });

test("primera fotografía: guarda en S3, actualiza BD y devuelve URL firmada", async () => {
  const { controlador, estado } = entornoControlador();
  const res = respuesta();
  await controlador.subirFotoPerfil(peticion({ body: await imagen("jpeg") }), res);
  assert.equal(res.codigo, 201);
  assert.equal(res.cuerpo.ok, true);
  assert.match(estado.foto, /^usuarios\/fotos-perfil\/7\//);
  assert.deepEqual(estado.guardados, [estado.foto]);
  assert.equal(res.cuerpo.url.includes(estado.foto), true);
  assert.deepEqual(estado.eliminados, []);
});

test("cambio de fotografía: la anterior se elimina solo tras actualizar la BD", async () => {
  const anterior = "usuarios/fotos-perfil/7/vieja.webp";
  const { controlador, estado } = entornoControlador({ fotoActual: anterior });
  const res = respuesta();
  await controlador.subirFotoPerfil(peticion({ body: await imagen("png") }), res);
  assert.equal(res.codigo, 201);
  assert.notEqual(estado.foto, anterior);
  assert.deepEqual(estado.eliminados, [anterior]);
});

test("el id sale del JWT: un usuario_id en el cuerpo/consulta no se usa", async () => {
  const { controlador, estado } = entornoControlador();
  const res = respuesta();
  await controlador.subirFotoPerfil(
    peticion({ body: await imagen("png"), query: { usuario_id: 8 } }),
    res,
  );
  assert.match(estado.foto, /^usuarios\/fotos-perfil\/7\//);
});

test("falla S3: conserva la fotografía anterior y no toca la BD", async () => {
  const anterior = "usuarios/fotos-perfil/7/vieja.webp";
  const { controlador, estado } = entornoControlador({ fotoActual: anterior, fallaS3: true });
  const res = respuesta();
  await controlador.subirFotoPerfil(peticion({ body: await imagen("png") }), res);
  assert.equal(res.codigo, 502);
  assert.equal(res.cuerpo.code, "ALMACENAMIENTO_ERROR");
  assert.equal(estado.foto, anterior);
  assert.deepEqual(estado.eliminados, []);
});

test("falla MySQL: elimina el objeto nuevo (sin huérfanos) y conserva el anterior", async () => {
  const anterior = "usuarios/fotos-perfil/7/vieja.webp";
  const { controlador, estado } = entornoControlador({ fotoActual: anterior, fallaBD: true });
  const res = respuesta();
  await controlador.subirFotoPerfil(peticion({ body: await imagen("png") }), res);
  assert.equal(res.codigo, 500);
  assert.equal(estado.foto, anterior);
  assert.deepEqual(estado.eliminados, estado.guardados);
  assert.equal(estado.eliminados.includes(anterior), false);
});

test("archivo inválido: responde 4xx y no escribe en S3", async () => {
  const { controlador, estado } = entornoControlador();
  const res = respuesta();
  await controlador.subirFotoPerfil(peticion({ body: Buffer.from("no soy imagen") }), res);
  assert.equal(res.codigo, 400);
  assert.equal(res.cuerpo.code, "IMAGEN_CORRUPTA");
  assert.deepEqual(estado.guardados, []);
});

test("sesión QR no puede administrar fotografías", async () => {
  const { controlador } = entornoControlador();
  for (const accion of ["subirFotoPerfil", "eliminarFotoPerfil", "obtenerFotoPerfil"]) {
    const res = respuesta();
    await controlador[accion](peticion({ sessionType: "QR", body: await imagen("png") }), res);
    assert.equal(res.codigo, 403);
    assert.equal(res.cuerpo.code, "SESION_NO_PERMITIDA");
  }
});

test("eliminar: deja la referencia en NULL y borra el objeto; sin foto no falla", async () => {
  const actual = "usuarios/fotos-perfil/7/a.webp";
  let { controlador, estado } = entornoControlador({ fotoActual: actual });
  let res = respuesta();
  await controlador.eliminarFotoPerfil(peticion(), res);
  assert.equal(res.codigo, 200);
  assert.equal(estado.foto, null);
  assert.deepEqual(estado.eliminados, [actual]);

  ({ controlador, estado } = entornoControlador());
  res = respuesta();
  await controlador.eliminarFotoPerfil(peticion(), res);
  assert.equal(res.codigo, 200);
  assert.deepEqual(estado.eliminados, []);
});

test("eliminar no borra valores heredados que no son claves gestionadas", async () => {
  const { controlador, estado } = entornoControlador({ fotoActual: "heredada.png" });
  const res = respuesta();
  await controlador.eliminarFotoPerfil(peticion(), res);
  assert.equal(estado.foto, null);
  assert.deepEqual(estado.eliminados, []);
});

test("obtener: usuario sin fotografía devuelve nulos; con fotografía, URL firmada", async () => {
  let { controlador } = entornoControlador();
  let res = respuesta();
  await controlador.obtenerFotoPerfil(peticion(), res);
  assert.deepEqual(JSON.parse(JSON.stringify(res.cuerpo)), { ok: true, foto: null, url: null, expiraEn: null });

  ({ controlador } = entornoControlador({ fotoActual: "usuarios/fotos-perfil/7/a.webp" }));
  res = respuesta();
  await controlador.obtenerFotoPerfil(peticion(), res);
  assert.equal(res.cuerpo.foto, "usuarios/fotos-perfil/7/a.webp");
  assert.match(res.cuerpo.url, /^https:\/\/s3\.test\//);
});

test("urls en lote: solo claves propias de cada usuario (ignora heredadas y ajenas)", async () => {
  const { controlador, estado } = entornoControlador();
  const res = respuesta();
  await controlador.obtenerUrlsFotos(peticion({ body: { ids: [7, "8", 9, 9, "x", -1] } }), res);
  assert.deepEqual([...Object.keys(res.cuerpo.fotos)], ["7"]);
  assert.deepEqual([...estado.consultas[0].where.id.in], [7, 8, 9]);
});

test("columna truncada: detecta que la referencia quedó incompleta, borra el objeto nuevo y conserva el anterior", async () => {
  const anterior = "usuarios/fotos-perfil/7/vieja.webp";
  const { controlador, estado } = entornoControlador({ fotoActual: anterior, truncaA: 50 });
  const res = respuesta();
  await controlador.subirFotoPerfil(peticion({ body: await imagen("png") }), res);
  assert.equal(res.codigo, 500);
  assert.equal(res.cuerpo.code, "ALMACENAMIENTO_ERROR");
  assert.deepEqual(estado.eliminados, estado.guardados);
  assert.equal(estado.eliminados.includes(anterior), false);
});
