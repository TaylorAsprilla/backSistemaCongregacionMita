import assert from "node:assert/strict";
import { test } from "node:test";
import Informe from "../src/models/informe.model";
import Campo from "../src/models/campo.model";
import Congregacion from "../src/models/congregacion.model";
import Pais from "../src/models/pais.model";
import Usuario from "../src/models/usuario.model";
import UsuarioCongregacion from "../src/models/usuarioCongregacion.model";
import { obtenerAmbitosResponsabilidad } from "../src/services/informeResponsables";
import * as informeResponsables from "../src/services/informeResponsables";
import InformeResponsable from "../src/models/informeResponsable.model";
import { getMisResponsabilidades } from "../src/controllers/informe.controller";

const registro = (datos: Record<string, unknown>) => ({
  getDataValue: (campo: string) => datos[campo],
});

test("enumera Congregaciones Ciudad y País solo con sus responsables formales", async (t) => {
  t.mock.method(Pais as any, "findAll", async () => [
    registro({ id: 2, pais: "Chile" }),
  ]);
  t.mock.method(Congregacion as any, "findAll", async () => [
    registro({
      id: 5,
      congregacion: "Tuluá",
      pais_id: 2,
      idObreroEncargado: 1,
      idObreroEncargadoDos: 2,
    }),
  ]);
  t.mock.method(Campo as any, "findAll", async () => []);
  const asignacionesFeligreses = t.mock.method(
    UsuarioCongregacion as any,
    "findAll",
    async () => [registro({ usuario_id: 3, congregacion_id: 5, campo_id: 0 })],
  );
  t.mock.method(Usuario as any, "findAll", async () => [
    registro({
      id: 1,
      primerNombre: "Pedro",
      segundoNombre: null,
      primerApellido: "Pérez",
      segundoApellido: null,
    }),
    registro({
      id: 2,
      primerNombre: "Carlos",
      segundoNombre: null,
      primerApellido: "Gómez",
      segundoApellido: null,
    }),
    registro({
      id: 3,
      primerNombre: "Feligres",
      segundoNombre: null,
      primerApellido: "Asignado",
      segundoApellido: null,
    }),
  ]);

  const ambitos = await obtenerAmbitosResponsabilidad(1);

  assert.deepEqual(
    ambitos.map(({ tipo_congregacion, congregacion_id, nombre_unidad }) => ({
      tipo_congregacion,
      congregacion_id,
      nombre_unidad,
    })),
    [
      { tipo_congregacion: "PAIS", congregacion_id: 2, nombre_unidad: "Chile" },
      {
        tipo_congregacion: "CONGREGACION",
        congregacion_id: 5,
        nombre_unidad: "Tuluá",
      },
    ],
  );
  assert.equal(asignacionesFeligreses.mock.callCount(), 0);
  assert.deepEqual(
    ambitos[1].responsables.map(({ usuario_id }) => usuario_id),
    [1, 2],
  );
  assert.deepEqual(
    ambitos[1].responsables.map(
      ({ nombre_responsable, tipo_responsabilidad }) => ({
        nombre_responsable,
        tipo_responsabilidad,
      }),
    ),
    [
      { nombre_responsable: "Pedro Pérez", tipo_responsabilidad: "PRINCIPAL" },
      { nombre_responsable: "Carlos Gómez", tipo_responsabilidad: "AUXILIAR" },
    ],
  );
});

test("la clave única del modelo impide duplicar periodo y Congregación por responsable", () => {
  const indice = (Informe as any).options.indexes.find(
    (index: any) => index.name === "uq_informe_periodo_congregacion",
  );
  assert.ok(indice?.unique);
  assert.deepEqual(indice.fields, [
    "periodo",
    "tipo_congregacion",
    "congregacion_id",
  ]);
});

test("las consultas de ámbitos usan la jerarquía y los responsables históricos al cerrar", async (t) => {
  t.mock.method(informeResponsables, "obtenerAmbitosResponsabilidad", async () => [
    {
      tipo_congregacion: "CONGREGACION",
      congregacion_id: 5,
      nombre_unidad: "Nombre actual",
      nombre_pais: "País actual",
      nombre_congregacion: "Ciudad actual",
      nombre_campo: null,
      responsables: [
        {
          usuario_id: 302,
          nombre_responsable: "Obrero actual",
          tipo_responsabilidad: "PRINCIPAL",
        },
      ],
    },
  ]);
  const informeHistorico = {
    getDataValue: (campo: string) =>
      ({
        id: 12,
        estado: "Cerrado",
        tipo_congregacion: "CONGREGACION",
        congregacion_id: 5,
        nombre_unidad: "Nombre al cierre",
        nombre_pais: "País al cierre",
        nombre_congregacion: "Ciudad al cierre",
        nombre_campo: null,
      })[campo],
    get: () => ({
      id: 12,
      estado: "Cerrado",
      tipo_congregacion: "CONGREGACION",
      congregacion_id: 5,
      nombre_unidad: "Nombre al cierre",
      nombre_pais: "País al cierre",
      nombre_congregacion: "Ciudad al cierre",
      nombre_campo: null,
    }),
  };
  t.mock.method(Informe as any, "findAll", async ({ where }: any) =>
    where.usuario_id ? [] : [informeHistorico],
  );
  t.mock.method(InformeResponsable as any, "findAll", async () => [
    registro({
      informe_id: 12,
      usuario_id: 101,
      nombre_responsable: "Obrero al cierre",
      tipo_responsabilidad: "PRINCIPAL",
    }),
  ]);
  let cuerpo: any;

  await getMisResponsabilidades(
    { id: 101, query: { periodo: "2026-01-01" } } as any,
    { json: (respuesta: any) => (cuerpo = respuesta) } as any,
  );

  assert.equal(cuerpo.ambitos[0].nombre_unidad, "Nombre al cierre");
  assert.equal(cuerpo.ambitos[0].nombre_pais, "País al cierre");
  assert.deepEqual(cuerpo.ambitos[0].responsables, [
    {
      usuario_id: 101,
      nombre_responsable: "Obrero al cierre",
      tipo_responsabilidad: "PRINCIPAL",
    },
  ]);
});
