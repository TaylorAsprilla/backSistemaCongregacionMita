import assert from "node:assert/strict";
import { test } from "node:test";
import db from "../src/database/connection";
import Informe from "../src/models/informe.model";
import InformeAuditoria from "../src/models/informeAuditoria.model";
import InformeResponsable from "../src/models/informeResponsable.model";
import Congregacion from "../src/models/congregacion.model";
import Pais from "../src/models/pais.model";
import Usuario from "../src/models/usuario.model";
import UsuarioCongregacion from "../src/models/usuarioCongregacion.model";
import { ESTADO_INFORME_ENUM } from "../src/enum/informe.enum";
import { cerrarInformeTransaccional } from "../src/services/cerrarInforme";
import { eliminarInforme } from "../src/controllers/informe.controller";

const registro = (datos: Record<string, unknown>) => ({
  getDataValue: (campo: string) => datos[campo],
  update: async (cambios: Record<string, unknown>) => {
    Object.assign(datos, cambios);
    return registro(datos);
  },
});

test("al cerrar guarda responsables y jerarquía dentro de la transacción", async (t) => {
  const valoresInforme: Record<string, unknown> = {
    id: 12,
    usuario_id: 101,
    tipo_congregacion: "CONGREGACION",
    congregacion_id: 7,
    estado: ESTADO_INFORME_ENUM.ABIERTO,
  };
  const fakeInforme = registro(valoresInforme);
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  let snapshot: Record<string, unknown>[] = [];
  let transactionUsed: unknown;

  t.mock.method(db as any, "transaction", async (callback: any) =>
    callback(transaction),
  );
  t.mock.method(Informe as any, "findByPk", async (_id: number, options: any) => {
    transactionUsed = options.transaction;
    assert.equal(options.lock, transaction.LOCK.UPDATE);
    return fakeInforme;
  });
  t.mock.method(Congregacion as any, "findByPk", async () =>
    registro({
      id: 7,
      congregacion: "Tuluá",
      pais_id: 2,
      estado: true,
      idObreroEncargado: 101,
      idObreroEncargadoDos: 202,
    }),
  );
  t.mock.method(Pais as any, "findByPk", async () =>
    registro({ id: 2, pais: "Colombia" }),
  );
  const asignacionesFeligreses = t.mock.method(
    UsuarioCongregacion as any,
    "findAll",
    async () => [registro({ usuario_id: 404 })],
  );
  t.mock.method(Usuario as any, "findAll", async () => [
    registro({
      id: 101,
      primerNombre: "Pedro",
      segundoNombre: null,
      primerApellido: "Pérez",
      segundoApellido: null,
    }),
    registro({
      id: 202,
      primerNombre: "Carlos",
      segundoNombre: null,
      primerApellido: "Gómez",
      segundoApellido: null,
    }),
  ]);
  t.mock.method(InformeResponsable as any, "destroy", async () => 0);
  t.mock.method(InformeAuditoria as any, "create", async () => null);
  t.mock.method(InformeResponsable as any, "bulkCreate", async (filas: any[]) => {
    snapshot = filas;
    return filas;
  });

  const cerrado = await cerrarInformeTransaccional(12, 303);

  assert.equal(transactionUsed, transaction);
  assert.equal(valoresInforme.estado, ESTADO_INFORME_ENUM.CERRADO);
  assert.equal(valoresInforme.usuario_cierre_id, 303);
  assert.ok(valoresInforme.fecha_cierre instanceof Date);
  assert.equal(valoresInforme.nombre_unidad, "Tuluá");
  assert.equal(valoresInforme.nombre_pais, "Colombia");
  assert.equal(asignacionesFeligreses.mock.callCount(), 0);
  assert.deepEqual(
    snapshot.map(({ nombre_responsable, tipo_responsabilidad }) => ({
      nombre_responsable,
      tipo_responsabilidad,
    })),
    [
      { nombre_responsable: "Pedro Pérez", tipo_responsabilidad: "PRINCIPAL" },
      { nombre_responsable: "Carlos Gómez", tipo_responsabilidad: "AUXILIAR" },
    ],
  );
  assert.equal(cerrado?.getDataValue("estado"), ESTADO_INFORME_ENUM.CERRADO);
});

test("un informe cerrado no vuelve a consultar ni reemplaza su snapshot", async (t) => {
  const fakeInforme = registro({
    id: 12,
    usuario_id: 101,
    tipo_congregacion: "CONGREGACION",
    congregacion_id: 7,
    estado: ESTADO_INFORME_ENUM.CERRADO,
  });
  t.mock.method(db as any, "transaction", async (callback: any) =>
    callback({ LOCK: { UPDATE: "UPDATE" } }),
  );
  t.mock.method(Informe as any, "findByPk", async () => fakeInforme);
  t.mock.method(Congregacion as any, "findByPk", async () => {
    throw new Error("No se debe consultar la asignación actual.");
  });
  t.mock.method(InformeResponsable as any, "destroy", async () => {
    throw new Error("No se debe modificar el snapshot.");
  });

  const resultado = await cerrarInformeTransaccional(12, 404);

  assert.equal(resultado, fakeInforme);
  assert.equal(fakeInforme.getDataValue("usuario_cierre_id"), undefined);
});

test("un informe cerrado no se puede eliminar ni modificar su estado histórico", async (t) => {
  const informeCerrado = registro({
    id: 12,
    usuario_id: 101,
    estado: ESTADO_INFORME_ENUM.CERRADO,
  });
  const actualizar = t.mock.method(informeCerrado, "update", async () => {
    throw new Error("No se debe modificar un informe cerrado.");
  });
  t.mock.method(Informe as any, "findByPk", async () => informeCerrado);
  const respuesta: {
    statusCode: number;
    cuerpo: Record<string, unknown> | null;
    status: (codigo: number) => typeof respuesta;
    json: (cuerpo: Record<string, unknown>) => typeof respuesta;
  } = {
    statusCode: 200,
    cuerpo: null,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };

  await eliminarInforme(
    { params: { id: "12" }, body: {} } as any,
    respuesta as any,
  );

  assert.equal(respuesta.statusCode, 409);
  assert.match(String(respuesta.cuerpo?.msg), /registros históricos/);
  assert.equal(actualizar.mock.callCount(), 0);
});
