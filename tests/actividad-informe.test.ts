import assert from "node:assert/strict";
import { test } from "node:test";
import Actividad from "../src/models/actividad.model";
import Congregacion from "../src/models/congregacion.model";
import Campo from "../src/models/campo.model";
import actividadRoutes from "../src/routes/actividad.routes";
import {
  actualizarActividad,
  crearActividad,
  eliminarActividad,
} from "../src/controllers/actividad.controller";
import * as informeAutorizado from "../src/helpers/informe-autorizado";
import * as consultas from "../src/services/dashboardSupervision/consultas";
import * as supervisionObrero from "../src/services/supervisionObrero.authorization";

const crearRespuesta = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (codigo: number) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
};

test("expone DELETE protegido para las actividades del informe", () => {
  const ruta = (actividadRoutes as any).stack.find(
    (capa: any) => capa.route?.path === "/:id" && capa.route.methods.delete,
  );
  assert.ok(ruta);
  assert.ok(ruta.route.stack.length >= 3);
});

test("el permiso OBRERO CONGREGACION identifica la congregación asignada", async (t) => {
  t.mock.method(consultas, "obtenerPermisosUsuario", async () => []);
  t.mock.method(consultas, "obtenerNombresPermisosUsuario", async () => [
    "OBRERO CONGREGACION",
  ]);
  t.mock.method(Congregacion as any, "findAll", async () => [
    { getDataValue: () => 55 },
  ]);
  t.mock.method(Campo as any, "findAll", async () => []);

  assert.deepEqual(await supervisionObrero.obtenerContextoObrero(42), {
    unidades: [{ tipo: "CONGREGACION", id: 55 }],
  });
});

test("el obrero asignado puede modificar un informe de su congregación y no de otra", async (t) => {
  const informe = {
    getDataValue: (campo: string) =>
      ({
        usuario_id: 99,
        tipo_congregacion: "CONGREGACION",
        congregacion_id: 55,
      })[campo],
  };
  let unidades = [{ tipo: "CONGREGACION" as const, id: 55 }];
  t.mock.method(informeAutorizado, "obtenerInformeAutorizado", async () => informe as any);
  t.mock.method(consultas, "obtenerPermisosUsuario", async () => ["4"]);
  t.mock.method(supervisionObrero, "obtenerContextoObrero", async () => ({ unidades }));

  assert.equal(
    await informeAutorizado.obtenerInformeEditable({ id: 42 } as any, "8"),
    informe,
  );

  unidades = [{ tipo: "CONGREGACION", id: 56 }];
  assert.equal(
    await informeAutorizado.obtenerInformeEditable({ id: 42 } as any, "8"),
    null,
  );
});

test("crear, editar y eliminar validan el informe autorizado", async (t) => {
  t.mock.method(informeAutorizado, "obtenerInformeEditable", async () => ({}) as any);

  const nuevaActividad = { save: async () => undefined };
  const construir = t.mock.method(Actividad as any, "build", () => nuevaActividad);
  const crearRes = crearRespuesta();
  await crearActividad(
    { id: 42, body: { informe_id: 8, fecha: "2026-10-01" } } as any,
    crearRes,
  );
  assert.equal(crearRes.statusCode, 200);
  assert.equal(construir.mock.callCount(), 1);

  const actividad = {
    getDataValue: () => 8,
    update: async () => ({ id: 12 }),
    destroy: async () => undefined,
  };
  const buscar = t.mock.method(Actividad as any, "findByPk", async () => actividad);
  const editarRes = crearRespuesta();
  await actualizarActividad(
    { id: 42, params: { id: "12" }, body: { informe_id: 8, responsable: "Ana" } } as any,
    editarRes,
  );
  assert.equal(editarRes.statusCode, 200);

  const eliminarRes = crearRespuesta();
  await eliminarActividad({ id: 42, params: { id: "12" } } as any, eliminarRes);
  assert.equal(eliminarRes.statusCode, 200);
  assert.equal(eliminarRes.body.ok, true);
  assert.equal(buscar.mock.callCount(), 2);
});

test("rechaza modificar actividades de un informe no autorizado", async (t) => {
  t.mock.method(informeAutorizado, "obtenerInformeEditable", async () => null);
  const buscar = t.mock.method(Actividad as any, "findByPk", async () => ({
    getDataValue: () => 8,
    update: async () => assert.fail("no debe modificar la actividad"),
  }));
  const res = crearRespuesta();

  await actualizarActividad(
    { id: 42, params: { id: "12" }, body: { responsable: "Ana" } } as any,
    res,
  );

  assert.equal(res.statusCode, 404);
  assert.equal(buscar.mock.callCount(), 1);
});

test("no permite cambiar de informe una actividad existente", async (t) => {
  t.mock.method(informeAutorizado, "obtenerInformeEditable", async () => ({}) as any);
  const buscar = t.mock.method(Actividad as any, "findByPk", async () => ({
    getDataValue: () => 8,
    update: async () => assert.fail("no debe mover la actividad"),
  }));
  const res = crearRespuesta();

  await actualizarActividad(
    { id: 42, params: { id: "12" }, body: { informe_id: 9 } } as any,
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.equal(buscar.mock.callCount(), 1);
});
