import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import type { Request } from "express";
import type * as Autorizacion from "../../src/helpers/informe-autorizado";

const preparar = (
  permisos: string[],
  paises: number[] | null = null,
  fallo = false,
  propietarioInforme = 1,
) => {
  const llamadas: { where: { id: string; usuario_id?: { in: number[] } } }[] = [];
  const exports: Partial<typeof Autorizacion> = {};
  let consultasContexto = 0;
  runInNewContext(readFileSync(require.resolve("../../src/helpers/informe-autorizado"), "utf8"), {
    exports,
    console,
    require: (nombre: string) => {
      switch (nombre) {
        case "sequelize": return { Op: { in: "in" } };
        case "../enum/roles.enum": return { ROLES_ID: { ADMINISTRADOR: "1" } };
        case "../enum/informe.enum": return {
          ESTADO_INFORME_ENUM: { CERRADO: "Cerrado" },
        };
        case "../models/informe.model": return {
          __esModule: true,
          default: {
            findOne: async (opciones: typeof llamadas[number]) => {
              llamadas.push(opciones);
              return {
                getDataValue: (campo: string) =>
                  campo === "id" ? 12 : campo === "usuario_id" ? propietarioInforme : null,
              };
            },
          },
        };
        case "../models/informeResponsable.model": return {
          __esModule: true,
          default: { findOne: async () => null },
        };
        case "../services/dashboardSupervision/consultas": return {
          obtenerPermisosUsuario: async () => {
            if (fallo) throw new Error("permisos no disponibles");
            return permisos;
          },
        };
        case "../services/supervisionPais.authorization": return {
          obtenerContextoObreroPais: async () => {
            consultasContexto++;
            return paises ? { paises } : null;
          },
          obtenerObrerosAsignadosAlPais: async () => [8, 9],
        };
        case "../services/supervisionObrero.authorization": return {
          obtenerContextoObrero: async () => null,
        };
        case "../services/informeResponsables": return {
          obtenerAmbitosResponsabilidad: async () => [],
        };
        default: throw new Error(`Dependencia inesperada: ${nombre}`);
      }
    },
  });
  const consultar = exports.obtenerInformeAutorizado;
  if (!consultar) throw new Error("Falta obtenerInformeAutorizado");
  const request = (id?: number) => ({ id } as Request & { id?: number });
  return { consultar, llamadas, request, consultasContexto: () => consultasContexto };
};

describe("lectura de informes por rol", () => {
  it("el administrador puede consultar otro obrero aunque también tenga rol de obrero país", async () => {
    const prueba = preparar(["1", "2"], [1]);
    await prueba.consultar(prueba.request(1), "12");
    assert.equal(prueba.llamadas[0].where.id, "12");
    assert.equal(prueba.llamadas[0].where.usuario_id, undefined);
    assert.equal(prueba.consultasContexto(), 0);
  });

  it("un usuario no administrador solo consulta sus informes o unidades asignadas", async () => {
    const prueba = preparar(["4"]);
    await prueba.consultar(prueba.request(1), "12");
    assert.equal(prueba.llamadas[0].where.id, "12");
  });

  it("el obrero país conserva exclusivamente los autores de su alcance", async () => {
    const prueba = preparar(["2"], [1], false, 8);
    await prueba.consultar(prueba.request(1), "12");
    assert.equal(prueba.llamadas[0].where.id, "12");
  });

  it("no consulta informes sin usuario autenticado", async () => {
    const prueba = preparar(["1"]);
    assert.equal(await prueba.consultar(prueba.request(), "12"), null);
    assert.equal(prueba.llamadas.length, 0);
  });

  it("no concede acceso si falla la consulta de permisos", async () => {
    const prueba = preparar([], null, true);
    await assert.rejects(prueba.consultar(prueba.request(1), "12"), /permisos no disponibles/);
    assert.equal(prueba.llamadas.length, 0);
  });
});
