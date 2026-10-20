import assert from "node:assert/strict";
import { test } from "node:test";
import db from "../src/database/connection";
import InformeAuditoria from "../src/models/informeAuditoria.model";
import { ESTADO_INFORME_ENUM } from "../src/enum/informe.enum";
import { obtenerFechaCierreInforme } from "../src/helpers/periodoInforme";
import Informe from "../src/models/informe.model";
import {
  bloquearInformeCerradoEnCreacion,
  informeVencido,
} from "../src/middlewares/bloquear-informe-cerrado";
import closeExpiredQuarterlyReports, {
  runReportClosureStartupCatchup,
} from "../src/crons/closeQuarterlyReports";
import * as cierreInforme from "../src/services/cerrarInforme";
import { informeAuditContext } from "../src/helpers/informeAuditContext";

const registro = (datos: Record<string, unknown>) => ({
  getDataValue: (campo: string) => datos[campo],
  get: () => ({ ...datos }),
});

const response = () => {
  const salida: { statusCode: number; body?: Record<string, any> } = {
    statusCode: 200,
  };
  const res = {
    status(code: number) {
      salida.statusCode = code;
      return res;
    },
    json(body: Record<string, any>) {
      salida.body = body;
      return res;
    },
  };
  return { res: res as any, salida };
};

test("el deadline permite escribir antes del cierre y rechaza el instante límite", () => {
  const fechaCierre = obtenerFechaCierreInforme(3, 2026);
  const informe = registro({
    periodo: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
  });
  assert.equal(informeVencido(informe as any, new Date(fechaCierre.getTime() - 1)), false);
  assert.equal(informeVencido(informe as any, fechaCierre), true);
});

test("una escritura al alcanzar la fecha límite cierra y rechaza el informe", async (t) => {
  const report = registro({
    id: 44,
    estado: ESTADO_INFORME_ENUM.ABIERTO,
    periodo: "2020-01-01",
  });
  t.mock.method(Informe as any, "findByPk", async () => report);
  let cierreAutomatico = false;
  t.mock.method(
    cierreInforme,
    "cerrarInformeTransaccional",
    async () => {
      cierreAutomatico = true;
      return report as any;
    },
  );
  const { res, salida } = response();
  let continuado = false;
  await bloquearInformeCerradoEnCreacion()(
    { body: { informe_id: 44 } } as any,
    res,
    (() => {
      continuado = true;
    }) as any,
  );
  assert.equal(cierreAutomatico, true);
  assert.equal(continuado, false);
  assert.equal(salida.statusCode, 409);
  assert.equal(salida.body?.code, "INFORME_VENCIDO");
});

test("los informes vencidos se identifican por su periodo, no por el usuario creador", () => {
  const informe = registro({
    periodo: "2026-07-01",
    usuario_id: 999,
  });
  const cierre = obtenerFechaCierreInforme(3, 2026);
  assert.equal(informeVencido(informe as any, cierre), true);
  assert.equal(informeVencido(informe as any, new Date(cierre.getTime() - 1)), false);
  assert.equal(Informe.name, "Informe");
});

test("el catch-up de arranque ejecuta el cierre de informes vencidos", async () => {
  let invocaciones = 0;
  await runReportClosureStartupCatchup(async () => {
    invocaciones += 1;
  });
  assert.equal(invocaciones, 1);
});

test("el job de cierre cierra solo informes abiertos que ya vencieron", async (t) => {
  const vencido = registro({
    id: 301,
    estado: ESTADO_INFORME_ENUM.ABIERTO,
    periodo: "2026-07-01",
  });
  const vigente = registro({
    id: 302,
    estado: ESTADO_INFORME_ENUM.ABIERTO,
    periodo: "2026-10-01",
  });
  t.mock.method(Informe as any, "findAll", async () => [vencido, vigente]);
  const idsCerrados: number[] = [];
  t.mock.method(
    cierreInforme,
    "cerrarInformeTransaccional",
    async (id: number) => {
      idsCerrados.push(id);
      return registro({ estado: ESTADO_INFORME_ENUM.CERRADO }) as any;
    },
  );
  const log = console.info;
  console.info = () => undefined;
  try {
    await closeExpiredQuarterlyReports();
  } finally {
    console.info = log;
  }
  assert.deepEqual(idsCerrados, [301]);
});

test("las escrituras de registros de sección generan auditoría con actor y transacción", async (t) => {
  const hooks = (db as any).options.define.hooks;
  let auditRow: any;
  let auditOptions: any;
  t.mock.method(InformeAuditoria as any, "create", async (values: any, options: any) => {
    auditRow = values;
    auditOptions = options;
    return undefined;
  });
  const data = {
    id: 73,
    informe_id: 44,
    comentarios: "updated text",
  };
  const instance = {
    constructor: { name: "Meta" },
    sequelize: db,
    getDataValue: (field: string) => (data as any)[field],
    get: () => ({ ...data }),
    changed: () => ["comentarios"],
    previous: () => "previous text",
  };
  const transaction = { id: "section-write-transaction" };

  await informeAuditContext.run(18, () =>
    hooks.afterUpdate(instance, { transaction }),
  );

  assert.equal(auditRow.informe_id, 44);
  assert.equal(auditRow.seccion, "metas");
  assert.equal(auditRow.registro_id, 73);
  assert.equal(auditRow.accion, "ACTUALIZAR");
  assert.equal(auditRow.usuario_id, 18);
  assert.deepEqual(auditRow.cambios, {
    comentarios: { anterior: "previous text", nuevo: "updated text" },
  });
  assert.equal(auditOptions.transaction, transaction);
});

test("un fallo de auditoría revierte también la transacción de escritura de una sección", async (t) => {
  const hooks = (db as any).options.define.hooks;
  let reverted = false;
  let committed = false;
  const transaction = {
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      reverted = true;
    },
  };
  t.mock.method(db as any, "transaction", async () => transaction);
  t.mock.method(InformeAuditoria as any, "create", async () => {
    throw new Error("audit unavailable");
  });
  const instance = {
    constructor: { name: "Meta" },
    sequelize: db,
    getDataValue: (field: string) =>
      ({ informe_id: 44, id: 73, comentarios: "create" } as any)[field],
    get: () => ({ id: 73, informe_id: 44, comentarios: "create" }),
    changed: () => ["comentarios"],
    previous: () => undefined,
  };
  const options: any = {};
  await hooks.beforeCreate(instance, options);
  await assert.rejects(() => hooks.afterCreate(instance, options));
  assert.equal(reverted, true);
  assert.equal(committed, false);
});
