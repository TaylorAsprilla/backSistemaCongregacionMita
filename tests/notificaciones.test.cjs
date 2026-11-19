const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { Op } = require("sequelize");

/** Transpila un módulo TS y lo ejecuta en un contexto aislado con dependencias simuladas. */
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
    Date,
    Intl,
    process: { env: entorno },
    require: (nombre) => {
      if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
      throw new Error(`Dependencia no prevista: ${nombre}`);
    },
  });
  return modulo.exports;
}

const json = (valor) => JSON.parse(JSON.stringify(valor));

// ------------------------------------------------------------ Configuración real
const roles = cargarModulo("src/enum/roles.enum.ts", {});
const configDashboard = cargarModulo("src/config/dashboardSupervision.config.ts", {
  "../enum/roles.enum": roles,
});
const configNotificaciones = (env = {}) => cargarModulo("src/config/notificaciones.config.ts", {}, env);

// ------------------------------------------------------------ Base en memoria
/** Evalúa el subconjunto de `where` de Sequelize que usa el servicio. */
function coincide(fila, where) {
  return Reflect.ownKeys(where).every((clave) => {
    const condicion = where[clave];
    if (clave === Op.or) return condicion.some((alt) => coincide(fila, alt));
    const valor = fila[clave];
    if (condicion !== null && typeof condicion === "object" && !(condicion instanceof Date)) {
      const [operador] = Reflect.ownKeys(condicion);
      const ref = condicion[operador];
      if (operador === Op.in) return ref.includes(valor);
      if (operador === Op.ne) return valor !== ref;
      if (operador === Op.gt) return valor !== null && valor > ref;
      if (operador === Op.lt) return valor !== null && valor < ref;
      throw new Error("Operador no soportado en la prueba");
    }
    return valor === condicion;
  });
}

function crearEntorno({ permisos = {} } = {}) {
  const filas = [];
  let siguienteId = 1;
  const envolver = (f) => ({ getDataValue: (c) => f[c], ...f });

  const Notificacion = {
    CATEGORIAS_NOTIFICACION: ["INFORMATIVA", "PENDIENTE", "ADMINISTRATIVA", "SOLICITUD"],
    count: async ({ where }) => filas.filter((f) => coincide(f, where)).length,
    findAndCountAll: async ({ where, limit, offset }) => {
      const todas = filas
        .filter((f) => coincide(f, where))
        .sort((a, b) => b.fecha_creacion - a.fecha_creacion || b.id - a.id);
      return { count: todas.length, rows: todas.slice(offset, offset + limit).map(envolver) };
    },
    update: async (valores, { where }) => {
      const objetivo = filas.filter((f) => coincide(f, where));
      objetivo.forEach((f) => Object.assign(f, valores));
      return [objetivo.length];
    },
    destroy: async ({ where }) => {
      const antes = filas.length;
      for (let i = filas.length - 1; i >= 0; i--) if (coincide(filas[i], where)) filas.splice(i, 1);
      return antes - filas.length;
    },
  };

  const consultas = [];
  const db = {
    /** Simula INSERT IGNORE con el índice único (usuario_id, clave_evento). */
    query: async (sql, { replacements }) => {
      consultas.push({ sql, replacements });
      let afectadas = 0;
      for (let i = 0; i < replacements.length; i += 10) {
        const [usuario_id, tipo, categoria, titulo, mensaje, entidad_tipo, entidad_id, url_destino, clave_evento, fecha_expiracion] =
          replacements.slice(i, i + 10);
        if (filas.some((f) => f.usuario_id === usuario_id && f.clave_evento === clave_evento)) continue;
        filas.push({
          id: siguienteId++,
          usuario_id, tipo, categoria, titulo, mensaje, entidad_tipo, entidad_id, url_destino, clave_evento,
          leida: false,
          fecha_lectura: null,
          fecha_creacion: new Date(Date.now() + siguienteId),
          fecha_expiracion,
        });
        afectadas++;
      }
      return [0, afectadas];
    },
  };

  const servicio = cargarModulo(
    "src/services/notificaciones/notificacion.service.ts",
    {
      crypto: require("node:crypto"),
      sequelize: { Op },
      "../../database/connection": db,
      "../../models/notificacion.model": Notificacion,
      "../../config/notificaciones.config": configNotificaciones(),
      "../../config/dashboardSupervision.config": configDashboard,
      "../dashboardSupervision/consultas": { obtenerPermisosUsuario: async (id) => permisos[id] ?? [] },
    },
  );
  return { servicio, filas, consultas };
}

const base = (extra = {}) => ({
  tipo: "PRUEBA",
  categoria: "INFORMATIVA",
  titulo: "Título",
  mensaje: "Mensaje",
  claveEvento: "EVT:1",
  ...extra,
});

// ------------------------------------------------------------------ Servicio

test("crea una notificación y solo la ve su destinatario", async () => {
  const { servicio } = crearEntorno();
  assert.equal(await servicio.crearNotificaciones([{ usuarioId: 7, ...base() }]), 1);

  const mias = await servicio.listar(7);
  assert.equal(mias.total, 1);
  assert.equal(mias.noLeidas, 1);
  assert.equal(mias.notificaciones[0].titulo, "Título");
  assert.equal(mias.notificaciones[0].leida, false);

  const ajenas = await servicio.listar(8);
  assert.equal(ajenas.total, 0);
  assert.equal(await servicio.contarNoLeidas(8), 0);
});

test("evita duplicados: el mismo evento para el mismo usuario se crea una sola vez", async () => {
  const { servicio, filas } = crearEntorno();
  assert.equal(await servicio.crearNotificaciones([{ usuarioId: 7, ...base() }]), 1);
  assert.equal(await servicio.crearNotificaciones([{ usuarioId: 7, ...base() }]), 0);
  // El mismo evento para otro usuario sí es una notificación distinta.
  assert.equal(await servicio.crearNotificaciones([{ usuarioId: 8, ...base() }]), 1);
  // Otro evento para el mismo usuario también.
  assert.equal(await servicio.crearNotificaciones([{ usuarioId: 7, ...base({ claveEvento: "EVT:2" }) }]), 1);
  assert.equal(filas.length, 3);
  assert.equal(await servicio.contarNoLeidas(7), 2);
});

test("crearParaUsuarios descarta ids repetidos o inválidos", async () => {
  const { servicio, filas } = crearEntorno();
  const { usuarioId, ...datos } = { usuarioId: 0, ...base() };
  assert.equal(await servicio.crearParaUsuarios([7, 7, 8, 0, -1, NaN, 1.5], datos), 2);
  assert.deepEqual(filas.map((f) => f.usuario_id).sort(), [7, 8]);
});

test("valida datos obligatorios, recorta textos y solo admite rutas internas", async () => {
  const { servicio, filas } = crearEntorno();
  assert.equal(await servicio.crearNotificaciones([{ usuarioId: 7, ...base({ titulo: "" }) }]), 0);
  assert.equal(await servicio.crearNotificaciones([{ usuarioId: 7, ...base({ categoria: "OTRA" }) }]), 0);

  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base({ mensaje: "x".repeat(900), urlDestino: "https://malo.example/robo" }) },
    { usuarioId: 7, ...base({ claveEvento: "EVT:2", urlDestino: "/sistema/ver-informe/12" }) },
    { usuarioId: 7, ...base({ claveEvento: "EVT:3", urlDestino: "//malo.example" }) },
  ]);
  assert.equal(filas[0].mensaje.length, 500);
  assert.equal(filas[0].url_destino, null);
  assert.equal(filas[1].url_destino, "/sistema/ver-informe/12");
  assert.equal(filas[2].url_destino, null);
});

test("una clave de evento demasiado larga se reduce de forma estable", () => {
  const { servicio } = crearEntorno();
  const larga = "A".repeat(400);
  const a = servicio.normalizarClaveEvento(larga);
  assert.ok(a.length <= 191);
  assert.equal(a, servicio.normalizarClaveEvento(larga));
  assert.notEqual(a, servicio.normalizarClaveEvento(larga + "B"));
});

test("marcar como leída actualiza contador y es idempotente", async () => {
  const { servicio, filas } = crearEntorno();
  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base() },
    { usuarioId: 7, ...base({ claveEvento: "EVT:2" }) },
  ]);
  await servicio.marcarLeida(7, filas[0].id);
  assert.equal(await servicio.contarNoLeidas(7), 1);
  assert.equal(filas[0].leida, true);
  assert.ok(filas[0].fecha_lectura instanceof Date);
  await servicio.marcarLeida(7, filas[0].id); // ya leída: no falla
  assert.equal(await servicio.contarNoLeidas(7), 1);
});

test("un usuario no puede leer ni borrar notificaciones de otro (responde 404)", async () => {
  const { servicio, filas } = crearEntorno();
  await servicio.crearNotificaciones([{ usuarioId: 7, ...base() }]);
  const ajena = filas[0].id;

  await assert.rejects(() => servicio.marcarLeida(8, ajena), (e) => e.statusCode === 404);
  await assert.rejects(() => servicio.eliminar(8, ajena), (e) => e.statusCode === 404);
  assert.equal(filas[0].leida, false);
  assert.equal(filas.length, 1);
  await assert.rejects(() => servicio.marcarLeida(7, 9999), (e) => e.code === "NOTIFICACION_NO_ENCONTRADA");
});

test("marcar todas como leídas solo afecta al propio usuario", async () => {
  const { servicio } = crearEntorno();
  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base() },
    { usuarioId: 7, ...base({ claveEvento: "EVT:2" }) },
    { usuarioId: 8, ...base() },
  ]);
  assert.equal(await servicio.marcarTodasLeidas(7), 2);
  assert.equal(await servicio.contarNoLeidas(7), 0);
  assert.equal(await servicio.contarNoLeidas(8), 1);
});

test("filtros por estado y categoría, orden e historial paginado", async () => {
  const { servicio, filas } = crearEntorno();
  const lote = [];
  for (let i = 1; i <= 25; i++) {
    lote.push({ usuarioId: 7, ...base({ claveEvento: `E:${i}`, categoria: i % 5 === 0 ? "PENDIENTE" : "INFORMATIVA", titulo: `N${i}` }) });
  }
  await servicio.crearNotificaciones(lote);
  await servicio.marcarLeida(7, filas[24].id);

  const pagina1 = await servicio.listar(7, { porPagina: 10 });
  assert.equal(pagina1.total, 25);
  assert.equal(pagina1.totalPaginas, 3);
  assert.equal(pagina1.notificaciones.length, 10);
  assert.equal(pagina1.notificaciones[0].titulo, "N25", "la más reciente primero");

  const pagina3 = await servicio.listar(7, { porPagina: 10, pagina: 3 });
  assert.equal(pagina3.notificaciones.length, 5);

  const noLeidas = await servicio.listar(7, { estado: "no-leidas", porPagina: 50 });
  assert.equal(noLeidas.total, 24);
  assert.equal((await servicio.listar(7, { estado: "leidas" })).total, 1);
  assert.equal((await servicio.listar(7, { categoria: "PENDIENTE", porPagina: 50 })).total, 5);
  await assert.rejects(() => servicio.listar(7, { categoria: "NOPE" }), (e) => e.statusCode === 400);

  // El tamaño de página está acotado.
  assert.equal((await servicio.listar(7, { porPagina: 5000 })).porPagina, 50);
});

test("alertas administrativas: solo las ve quien conserva el permiso autorizado", async () => {
  const { servicio } = crearEntorno({ permisos: { 1: ["1"], 7: ["4"] } });
  const admin = { ...base({ categoria: "ADMINISTRATIVA", claveEvento: "ADM:1" }) };
  await servicio.crearNotificaciones([
    { usuarioId: 1, ...admin },
    { usuarioId: 7, ...admin }, // se creó, pero 7 no tiene permiso: no debe verla
    { usuarioId: 7, ...base() },
  ]);

  assert.equal((await servicio.listar(1)).total, 1);
  assert.equal(await servicio.contarNoLeidas(1), 1);

  const deSiete = await servicio.listar(7);
  assert.equal(deSiete.total, 1);
  assert.equal(deSiete.notificaciones[0].categoria, "INFORMATIVA");
  assert.equal(await servicio.contarNoLeidas(7), 1);
  assert.equal((await servicio.listar(7, { categoria: "ADMINISTRATIVA" })).total, 0);

  // "Marcar todas" tampoco toca las que no puede ver.
  assert.equal(await servicio.marcarTodasLeidas(7), 1);
});

test("las notificaciones expiradas no se muestran ni cuentan", async () => {
  const { servicio } = crearEntorno();
  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base({ expiraEn: new Date(Date.now() - 1000) }) },
    { usuarioId: 7, ...base({ claveEvento: "EVT:2", expiraEn: new Date(Date.now() + 3_600_000) }) },
    { usuarioId: 7, ...base({ claveEvento: "EVT:3" }) },
  ]);
  assert.equal((await servicio.listar(7)).total, 2);
  assert.equal(await servicio.contarNoLeidas(7), 2);
});

test("la depuración respeta la política de conservación", async () => {
  const { servicio, filas } = crearEntorno();
  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base({ claveEvento: "vieja-leida" }) },
    { usuarioId: 7, ...base({ claveEvento: "vieja-no-leida" }) },
    { usuarioId: 7, ...base({ claveEvento: "reciente" }) },
    { usuarioId: 7, ...base({ claveEvento: "expirada", expiraEn: new Date("2020-01-01") }) },
  ]);
  const dia = 86_400_000;
  filas[0].leida = true;
  filas[0].fecha_creacion = new Date(Date.now() - 100 * dia); // leída > 90 días
  filas[1].fecha_creacion = new Date(Date.now() - 100 * dia); // no leída < 365 días: se conserva
  const borradas = await servicio.depurar();
  assert.equal(borradas, 2);
  assert.deepEqual(filas.map((f) => f.clave_evento).sort(), ["reciente", "vieja-no-leida"]);
});

// --------------------------------------------------------------- Controlador

function crearControlador(opciones) {
  const entorno = crearEntorno(opciones);
  const controlador = cargarModulo("src/controllers/notificacion.controller.ts", {
    "../middlewares/validar-jwt": {},
    "../services/notificaciones/notificacion.service": entorno.servicio,
  });
  return { ...entorno, controlador };
}

const res = () => {
  const r = { codigo: 200, cuerpo: undefined };
  r.status = (c) => ((r.codigo = c), r);
  r.json = (b) => ((r.cuerpo = json(b)), r);
  return r;
};
const req = (extra = {}) => ({ id: 7, sessionType: "NORMAL", query: {}, params: {}, ...extra });

test("controlador: lista solo las notificaciones del usuario del JWT, ignorando usuario_id enviado", async () => {
  const { controlador, servicio } = crearControlador();
  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base() },
    { usuarioId: 8, ...base({ titulo: "AJENA" }) },
  ]);
  const r = res();
  await controlador.listarNotificaciones(req({ query: { usuario_id: "8", usuarioId: "8" } }), r);
  assert.equal(r.codigo, 200);
  assert.deepEqual(r.cuerpo.notificaciones.map((n) => n.titulo), ["Título"]);
  assert.equal(r.cuerpo.noLeidas, 1);
});

test("controlador: contador de no leídas y marcado individual", async () => {
  const { controlador, servicio, filas } = crearControlador();
  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base() },
    { usuarioId: 7, ...base({ claveEvento: "EVT:2" }) },
  ]);
  let r = res();
  await controlador.contarNotificacionesNoLeidas(req(), r);
  assert.equal(r.cuerpo.noLeidas, 2);

  r = res();
  await controlador.marcarNotificacionLeida(req({ params: { id: String(filas[0].id) } }), r);
  assert.equal(r.codigo, 200);
  assert.equal(r.cuerpo.noLeidas, 1);
});

test("controlador: manipular el id de otra persona devuelve 404 y no modifica nada", async () => {
  const { controlador, servicio, filas } = crearControlador();
  await servicio.crearNotificaciones([{ usuarioId: 8, ...base() }]);
  const idAjeno = String(filas[0].id);

  let r = res();
  await controlador.marcarNotificacionLeida(req({ params: { id: idAjeno } }), r);
  assert.equal(r.codigo, 404);
  r = res();
  await controlador.eliminarNotificacion(req({ params: { id: idAjeno } }), r);
  assert.equal(r.codigo, 404);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].leida, false);
});

test("controlador: marcar todas, eliminar propia y validación de entradas", async () => {
  const { controlador, servicio, filas } = crearControlador();
  await servicio.crearNotificaciones([
    { usuarioId: 7, ...base() },
    { usuarioId: 7, ...base({ claveEvento: "EVT:2" }) },
  ]);
  let r = res();
  await controlador.marcarNotificacionesLeidas(req(), r);
  assert.equal(r.cuerpo.marcadas, 2);
  assert.equal(r.cuerpo.noLeidas, 0);

  r = res();
  await controlador.eliminarNotificacion(req({ params: { id: String(filas[0].id) } }), r);
  assert.equal(r.codigo, 200);
  assert.equal(filas.length, 1);

  for (const id of ["abc", "-3", "0", "1.5"]) {
    r = res();
    await controlador.marcarNotificacionLeida(req({ params: { id } }), r);
    assert.equal(r.codigo, 400, `id ${id}`);
  }
  r = res();
  await controlador.listarNotificaciones(req({ query: { estado: "otro" } }), r);
  assert.equal(r.codigo, 400);
  r = res();
  await controlador.listarNotificaciones(req({ query: { categoria: "NOPE" } }), r);
  assert.equal(r.codigo, 400);
});

test("controlador: las sesiones QR y sin usuario no tienen notificaciones (403)", async () => {
  const { controlador } = crearControlador();
  for (const sesion of [{ sessionType: "QR" }, { id: undefined }]) {
    for (const accion of ["listarNotificaciones", "contarNotificacionesNoLeidas", "marcarNotificacionesLeidas"]) {
      const r = res();
      await controlador[accion](req(sesion), r);
      assert.equal(r.codigo, 403, `${accion} ${JSON.stringify(sesion)}`);
    }
  }
});

// --------------------------------------------------------- Emisores de eventos

function crearEmisores({
  informes = {},
  informesPeriodo = [],
  congregaciones = {},
  listaCongregaciones = [],
  paises = [],
  obrerosPais = {},
  administradores = [],
  alertas = [],
  contextoAlertas = {},
  env = {},
} = {}) {
  const creadas = [];
  const guardar = async (items) => {
    let nuevas = 0;
    for (const n of items) {
      if (!creadas.some((c) => c.usuarioId === n.usuarioId && c.claveEvento === n.claveEvento)) {
        creadas.push(n);
        nuevas++;
      }
    }
    return nuevas;
  };
  const registro = (obj) => ({ ...obj, getDataValue: (c) => obj[c] });
  const filtrosPedidos = [];

  const eventos = cargarModulo("src/services/notificaciones/eventos.ts", {
    "../../models/congregacion.model": { findAll: async () => listaCongregaciones.map(registro) },
    "../../models/informe.model": {
      findByPk: async (id) => (informes[id] ? registro(informes[id]) : null),
      findAll: async () => informesPeriodo.map(registro),
    },
    "../../models/pais.model": { findAll: async () => paises.map(registro) },
    "../../models/solicitudMultimedia.model": { findByPk: async () => null },
    "../../models/usuario.model": { findByPk: async () => null },
    "../../enum/informe.enum": { ESTADO_INFORME_ENUM: { ABIERTO: "Abierto", CERRADO: "Cerrado", ELIMINADO: "Eliminado" } },
    "../../config/notificaciones.config": configNotificaciones(env),
    "../../config/dashboardSupervision.config": configDashboard,
    "../../helpers/periodoInforme": cargarModulo("src/helpers/periodoInforme.ts", {}),
    "../dashboardSupervision.service": {
      leerFiltros: (q) => (filtrosPedidos.push(q), { anio: Number(q.anio), trimestre: Number(q.trimestre) }),
      obtenerAlertas: async () => ({
        contexto: {
          periodoComparacion: { etiqueta: "Q2 2026" },
          coberturaTemporal: { sinCobertura: false },
          ...contextoAlertas,
        },
        alertas,
      }),
    },
    "./notificacion.service": {
      crearNotificaciones: guardar,
      crearParaUsuarios: (ids, datos) => guardar([...new Set(ids)].map((usuarioId) => ({ ...datos, usuarioId }))),
    },
    "./destinatarios": {
      obtenerAdministradores: async () => administradores,
      obtenerAprobadoresDeSolicitante: async () => [],
      obtenerObrerosPais: async (paisId) => obrerosPais[paisId] ?? [],
      obtenerResponsablesCongregacion: async (id) => congregaciones[id] ?? null,
      unicos: (...v) => [...new Set(v.flat().map(Number).filter((n) => Number.isInteger(n) && n > 0))],
    },
  });
  return { eventos, creadas, filtrosPedidos };
}

const informeCiudad = (extra = {}) => ({
  id: 10,
  usuario_id: 5,
  tipo_congregacion: "CONGREGACION",
  congregacion_id: 3,
  nombre_unidad: "Congregación Bogotá",
  estado: "Cerrado",
  periodo: "2026-07-01",
  ...extra,
});

test("informe cerrado: confirma a los responsables y avisa al Obrero País sin duplicar", async () => {
  const { eventos, creadas } = crearEmisores({
    informes: { 10: informeCiudad() },
    congregaciones: { 3: { nombre: "Bogotá", paisId: 1, responsables: [5, 6] } },
    obrerosPais: { 1: [20] },
  });
  await eventos.notificarInformeCerrado(10, 5);
  const porUsuario = Object.fromEntries(creadas.map((c) => [c.usuarioId, c.tipo]));
  assert.deepEqual(porUsuario, { 5: "INFORME_ENTREGADO", 6: "INFORME_ENTREGADO", 20: "INFORME_ENTREGADO_PAIS" });
  assert.ok(creadas.every((c) => c.urlDestino === "/sistema/ver-informe/10"));

  // Repetir el evento no crea nada nuevo.
  const total = creadas.length;
  await eventos.notificarInformeCerrado(10, 5);
  assert.equal(creadas.length, total);
});

test("informe cerrado automáticamente usa un mensaje propio", async () => {
  const { eventos, creadas } = crearEmisores({
    informes: { 10: informeCiudad() },
    congregaciones: { 3: { nombre: "Bogotá", paisId: 1, responsables: [5] } },
  });
  await eventos.notificarInformeCerrado(10, null);
  assert.equal(creadas[0].tipo, "INFORME_CERRADO_AUTOMATICO");
  assert.match(creadas[0].mensaje, /tercer trimestre de 2026/);
});

test("no se generan avisos de entrega para Congregación Campo, País ni informes abiertos", async () => {
  const { eventos, creadas } = crearEmisores({
    informes: {
      11: informeCiudad({ id: 11, tipo_congregacion: "CAMPO" }),
      12: informeCiudad({ id: 12, tipo_congregacion: "PAIS" }),
      13: informeCiudad({ id: 13, estado: "Abierto" }),
    },
    congregaciones: { 3: { nombre: "Bogotá", paisId: 1, responsables: [5] } },
    obrerosPais: { 1: [20] },
  });
  for (const id of [11, 12, 13]) await eventos.notificarInformeCerrado(id, 5);
  for (const id of [11, 12]) await eventos.notificarInformeCreado(id);
  assert.equal(creadas.length, 0);
});

test("informe creado: confirmación al autor con la fecha límite real del periodo", async () => {
  const { eventos, creadas } = crearEmisores({ informes: { 10: informeCiudad({ estado: "Abierto" }) } });
  await eventos.notificarInformeCreado(10);
  assert.equal(creadas.length, 1);
  assert.equal(creadas[0].usuarioId, 5);
  assert.equal(creadas[0].claveEvento, "INFORME_REGISTRADO:10");
  assert.match(creadas[0].mensaje, /14 de octubre de 2026/, "el cierre del Q3 2026 es el 14 de octubre");
});

const escenarioPendientes = () => ({
  listaCongregaciones: [
    { id: 3, congregacion: "Bogotá", pais_id: 1, idObreroEncargado: 5, idObreroEncargadoDos: 6 },
    { id: 4, congregacion: "Cali", pais_id: 1, idObreroEncargado: 8, idObreroEncargadoDos: null },
  ],
  informesPeriodo: [{ congregacion_id: 4, estado: "Cerrado" }],
  paises: [{ id: 1, pais: "Colombia" }],
  obrerosPais: { 1: [20] },
  administradores: [1],
});

test("recordatorio de informe pendiente: solo cuando falta poco para la fecha límite real", async () => {
  const { eventos, creadas } = crearEmisores(escenarioPendientes());
  // Q3 2026 cierra el 14 de octubre: faltando ~2 días aplica el umbral de 3.
  await eventos.generarRecordatoriosInformePendiente(new Date("2026-10-12T15:00:00Z"));

  const responsables = creadas.filter((c) => c.tipo === "INFORME_PENDIENTE");
  assert.deepEqual(responsables.map((c) => c.usuarioId).sort(), [5, 6], "solo la congregación sin informe cerrado");
  assert.ok(responsables.every((c) => c.categoria === "PENDIENTE" && c.claveEvento === "INFORME_PENDIENTE:3:2026-07-01:3"));
  assert.match(responsables[0].mensaje, /14 de octubre de 2026/);

  const pais = creadas.find((c) => c.tipo === "INFORME_PENDIENTE_PAIS");
  assert.equal(pais.usuarioId, 20);
  assert.match(pais.mensaje, /Bogotá/);
  assert.doesNotMatch(pais.mensaje, /Cali/);

  const admin = creadas.find((c) => c.tipo === "INFORME_PENDIENTE_ADMIN");
  assert.equal(admin.usuarioId, 1);
  assert.equal(admin.categoria, "ADMINISTRATIVA");
});

test("recordatorio de informe pendiente: no se repite el mismo día ni fuera de la ventana", async () => {
  const { eventos, creadas } = crearEmisores(escenarioPendientes());
  const ahora = new Date("2026-10-12T15:00:00Z");
  await eventos.generarRecordatoriosInformePendiente(ahora);
  const total = creadas.length;
  await eventos.generarRecordatoriosInformePendiente(new Date("2026-10-12T20:00:00Z"));
  assert.equal(creadas.length, total, "mismo umbral: sin duplicados");

  // Un día después ya aplica el umbral de 1: es otro aviso.
  await eventos.generarRecordatoriosInformePendiente(new Date("2026-10-13T15:00:00Z"));
  assert.ok(creadas.length > total);
  assert.ok(creadas.some((c) => c.claveEvento === "INFORME_PENDIENTE:3:2026-07-01:1"));

  // Lejos de la fecha límite y con el periodo ya vencido no se avisa.
  const otro = crearEmisores(escenarioPendientes());
  await otro.eventos.generarRecordatoriosInformePendiente(new Date("2026-09-20T15:00:00Z"));
  await otro.eventos.generarRecordatoriosInformePendiente(new Date("2026-10-14T06:00:00Z"));
  assert.equal(otro.creadas.length, 0);
});

test("umbrales de recordatorio configurables por entorno", async () => {
  const { eventos, creadas } = crearEmisores({ ...escenarioPendientes(), env: { NOTIF_INFORME_DIAS_ANTES: "10, 5" } });
  await eventos.generarRecordatoriosInformePendiente(new Date("2026-10-08T15:00:00Z")); // faltan ~6 días
  assert.ok(creadas.some((c) => c.claveEvento === "INFORME_PENDIENTE:3:2026-07-01:10"));
});

const alerta = (extra = {}) => ({
  id: "CONGREGACION-3-DISMINUCION-asistenciaGeneral",
  tipo: "DISMINUCION",
  nivel: "ATENCION",
  unidad: { tipo: "CONGREGACION", id: 3, nombre: "Bogotá" },
  mensaje: "Asistencia general disminuyó 12,5 % en Q3 2026 respecto a Q2 2026 (120 → 105).",
  periodo: "Q3 2026",
  ...extra,
});

test("alertas de supervisión: solo administradores, periodo cerrado, con valores y comparación", async () => {
  const { eventos, creadas, filtrosPedidos } = crearEmisores({
    administradores: [1, 2],
    alertas: [alerta(), alerta({ id: "CONGREGACION-3-INFORME_PENDIENTE", tipo: "INFORME_PENDIENTE" })],
  });
  // 2026-11-18: el periodo activo es Q4; se analiza Q3 (ya cerrado).
  await eventos.generarAlertasSupervision(new Date("2026-11-18T10:00:00Z"));

  assert.deepEqual(json(filtrosPedidos), [{ anio: "2026", trimestre: "3" }]);
  assert.equal(creadas.length, 2, "una por administrador; INFORME_PENDIENTE se excluye");
  assert.deepEqual(creadas.map((c) => c.usuarioId).sort(), [1, 2]);
  assert.ok(creadas.every((c) => c.categoria === "ADMINISTRATIVA"));
  assert.match(creadas[0].mensaje, /12,5 %.*Q3 2026.*Q2 2026.*120 → 105/);
  assert.equal(creadas[0].urlDestino, "/sistema/dashboard-supervision?anio=2026&trimestre=3");
  assert.equal(creadas[0].claveEvento, "SUPERVISION:CONGREGACION-3-DISMINUCION-asistenciaGeneral:Q3 2026:Q2 2026");

  // Ejecutarlo de nuevo no repite las alertas.
  await eventos.generarAlertasSupervision(new Date("2026-11-19T10:00:00Z"));
  assert.equal(creadas.length, 2);
});

test("alertas de supervisión: respeta cobertura, tope por ejecución y sin administradores no crea nada", async () => {
  const sinCobertura = crearEmisores({
    administradores: [1],
    alertas: [alerta()],
    contextoAlertas: { coberturaTemporal: { sinCobertura: true } },
  });
  await sinCobertura.eventos.generarAlertasSupervision(new Date("2026-11-18T10:00:00Z"));
  assert.equal(sinCobertura.creadas.length, 0);

  // Antes del inicio de cobertura (2026-07-01) no se analiza.
  const antiguo = crearEmisores({ administradores: [1], alertas: [alerta()] });
  await antiguo.eventos.generarAlertasSupervision(new Date("2026-07-20T10:00:00Z")); // analizaría Q1/Q2
  assert.equal(antiguo.creadas.length, 0);

  const muchas = crearEmisores({
    administradores: [1],
    env: { NOTIF_SUPERVISION_MAX: "3" },
    alertas: Array.from({ length: 10 }, (_, i) => alerta({ id: `X-${i}` })),
  });
  await muchas.eventos.generarAlertasSupervision(new Date("2026-11-18T10:00:00Z"));
  assert.equal(muchas.creadas.length, 3);

  const sinAdmins = crearEmisores({ administradores: [], alertas: [alerta()] });
  await sinAdmins.eventos.generarAlertasSupervision(new Date("2026-11-18T10:00:00Z"));
  assert.equal(sinAdmins.creadas.length, 0);
});

test("solicitud aprobada/rechazada: informa a la persona que la hizo", async () => {
  const { eventos, creadas } = crearEmisores();
  const ahora = new Date("2026-11-18T10:05:30Z");
  await eventos.notificarSolicitudResuelta(44, 9, "APROBADA", ahora);
  await eventos.notificarSolicitudResuelta(45, 9, "DENEGADA", ahora);
  assert.deepEqual(
    creadas.map((c) => [c.usuarioId, c.tipo, c.categoria]),
    [
      [9, "SOLICITUD_APROBADA", "SOLICITUD"],
      [9, "SOLICITUD_RECHAZADA", "SOLICITUD"],
    ],
  );
  // La misma resolución en el mismo minuto no se duplica.
  await eventos.notificarSolicitudResuelta(44, 9, "APROBADA", ahora);
  assert.equal(creadas.length, 2);
});

test("un fallo al notificar nunca rompe el flujo que lo origina", async () => {
  const { eventos } = crearEmisores();
  const explota = eventos.seguro("prueba", async () => {
    throw new Error("BD caída");
  });
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await explota(), null);
  } finally {
    console.error = original;
  }
});

test("claveSemana agrupa por semana ISO", () => {
  const { eventos } = crearEmisores();
  assert.equal(eventos.claveSemana(new Date("2026-11-16T10:00:00Z")), eventos.claveSemana(new Date("2026-11-22T23:00:00Z")));
  assert.notEqual(eventos.claveSemana(new Date("2026-11-22T23:00:00Z")), eventos.claveSemana(new Date("2026-11-23T01:00:00Z")));
});
