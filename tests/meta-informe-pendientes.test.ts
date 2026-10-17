import assert from "node:assert/strict";
import { test } from "node:test";
import { Op } from "sequelize";
import { ESTADO_INFORME_ENUM } from "../src/enum/informe.enum";
import * as informeAutorizado from "../src/helpers/informe-autorizado";
import Informe from "../src/models/informe.model";
import Meta from "../src/models/meta.model";
import TipoStatus from "../src/models/tipoStatus,model";
import {
  copiarMetaANuevoInforme,
  getMetasPendientesPorInforme,
  marcarMetaComoCumplida,
} from "../src/controllers/meta.controller";
import { obtenerPeriodoInformeActivo } from "../src/helpers/periodoInforme";

const periodoActual = obtenerPeriodoInformeActivo();
const periodoAnterior = (periodo: string) => {
  const fecha = new Date(`${periodo}T00:00:00Z`);
  fecha.setUTCMonth(fecha.getUTCMonth() - 3);
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const registro = (datos: Record<string, unknown>) => ({
  getDataValue: (campo: string) => datos[campo],
  update: async (cambios: Record<string, unknown>) => {
    Object.assign(datos, cambios);
    return registro(datos);
  },
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

test("las metas pendientes se consultan por ámbito y periodo, no por creador", async (t) => {
  const informeActual = registro({
    id: 30,
    tipo_congregacion: "CONGREGACION",
    congregacion_id: 7,
    periodo: periodoActual,
    estado: ESTADO_INFORME_ENUM.ABIERTO,
  });
  t.mock.method(
    informeAutorizado,
    "obtenerInformeAutorizado",
    async () => informeActual as any,
  );
  t.mock.method(TipoStatus as any, "findAll", async () => [
    registro({ id: 1 }),
    registro({ id: 2 }),
  ]);

  let whereInformes: Record<string, any> | undefined;
  t.mock.method(Informe as any, "findAll", async (options: any) => {
    whereInformes = options.where;
    return [registro({ id: 10 }), registro({ id: 20 })];
  });

  let whereMetas: Record<string, any> | undefined;
  t.mock.method(Meta as any, "findAll", async (options: any) => {
    whereMetas = options.where;
    return [];
  });

  const { res, salida } = response();
  await getMetasPendientesPorInforme(
    { params: { informeId: "30" }, id: 101 } as any,
    res,
  );

  assert.equal(salida.statusCode, 200);
  assert.deepEqual(whereInformes, {
    tipo_congregacion: "CONGREGACION",
    congregacion_id: 7,
    periodo: { [Op.lt]: periodoActual },
  });
  assert.deepEqual(whereMetas, {
    informe_id: { [Op.in]: [10, 20] },
    tipoStatus_id: { [Op.in]: [1, 2] },
    estado: true,
  });
  assert.equal("usuario_id" in (whereInformes ?? {}), false);
  assert.equal(salida.body?.metas.length, 0);
});

test("continuar una meta crea un registro nuevo en el informe abierto", async (t) => {
  const metaOriginal = registro({
    id: 5,
    informe_id: 10,
    meta: "Organizar visitas",
    accion: "Coordinar",
    comentarios: "Comentario anterior",
    tipoStatus_id: 1,
    estado: true,
  });
  const informeAnterior = registro({
    id: 10,
    tipo_congregacion: "CONGREGACION",
    congregacion_id: 7,
    periodo: periodoAnterior(periodoActual),
  });
  const informeActual = registro({
    id: 20,
    tipo_congregacion: "CONGREGACION",
    congregacion_id: 7,
    periodo: periodoActual,
    estado: ESTADO_INFORME_ENUM.ABIERTO,
  });
  t.mock.method(Meta as any, "findByPk", async () => metaOriginal);
  t.mock.method(Informe as any, "findByPk", async () => informeAnterior);
  t.mock.method(
    informeAutorizado,
    "obtenerInformeAutorizado",
    async () => informeActual as any,
  );
  t.mock.method(TipoStatus as any, "findAll", async () => [
    registro({ id: 1 }),
  ]);

  let valoresCreados: Record<string, unknown> | undefined;
  t.mock.method(Meta as any, "create", async (valores: Record<string, unknown>) => {
    valoresCreados = valores;
    return registro({ id: 99, ...valores });
  });

  const { res, salida } = response();
  await copiarMetaANuevoInforme(
    {
      body: {
        meta_id_original: 5,
        nuevo_informe_id: 20,
        actualizacion: "Se continuará el próximo trimestre",
      },
      id: 101,
    } as any,
    res,
  );

  assert.equal(salida.statusCode, 200);
  assert.equal(salida.body?.meta.getDataValue("id"), 99);
  assert.equal(valoresCreados?.informe_id, 20);
  assert.equal(valoresCreados?.metaOriginal_id, 5);
  assert.equal(
    valoresCreados?.comentarios,
    "Se continuará el próximo trimestre",
  );
  assert.equal(metaOriginal.getDataValue("comentarios"), "Comentario anterior");
});

test("no se completa una meta de un informe cerrado", async (t) => {
  const meta = registro({ id: 99, informe_id: 20, tipoStatus_id: 1 });
  t.mock.method(Meta as any, "findByPk", async () => meta);
  t.mock.method(
    informeAutorizado,
    "obtenerInformeAutorizado",
    async () => registro({ estado: ESTADO_INFORME_ENUM.CERRADO }) as any,
  );
  const buscarEstadoCumplido = t.mock.method(
    TipoStatus as any,
    "findOne",
    async () => registro({ id: 3 }),
  );

  const { res, salida } = response();
  await marcarMetaComoCumplida(
    { params: { id: "99" }, body: {}, id: 101 } as any,
    res,
  );

  assert.equal(salida.statusCode, 409);
  assert.equal(buscarEstadoCumplido.mock.callCount(), 0);
});
