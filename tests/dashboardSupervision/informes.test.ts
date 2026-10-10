import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import type * as Consultas from "../../src/services/dashboardSupervision/consultas";

const preparar = (total: number, filas: unknown[] = [], fallo = false) => {
  const llamadas: { sql: string; replacements: Record<string, unknown> }[] = [];
  const exports: Partial<typeof Consultas> = {};
  runInNewContext(
    readFileSync(require.resolve("../../src/services/dashboardSupervision/consultas"), "utf8"),
    {
      exports,
      require: (nombre: string) => {
        if (nombre === "sequelize") return { QueryTypes: { SELECT: "SELECT" } };
        if (nombre === "../../database/connection") return {
          __esModule: true,
          default: {
            query: async (sql: string, opciones: { replacements: Record<string, unknown> }) => {
              llamadas.push({ sql, replacements: opciones.replacements });
              if (fallo) throw new Error("consulta fallida");
              return llamadas.length === 1 ? [{ total }] : filas;
            },
          },
        };
        throw new Error(`Dependencia inesperada: ${nombre}`);
      },
    },
  );
  const consultar = exports.obtenerListadoInformes;
  if (!consultar) throw new Error("Falta obtenerListadoInformes");
  return { consultar, llamadas };
};

describe("listado administrativo de informes", () => {
  it("consulta todos los autores del trimestre sin depender de su asignación actual", async () => {
    const filas = [
      { id: 11, usuario_id: 1, obrero: "Obrero A", estado: "Abierto", periodo: "2026-07-01" },
      { id: 12, usuario_id: 2, obrero: "Obrero B", estado: "Cerrado", periodo: "2026-07-01" },
    ];
    const { consultar, llamadas } = preparar(2, filas);
    const resultado = await consultar("2026-07-01", "2026-10-01", "", 1, 10);
    assert.equal(resultado.total, 2);
    assert.equal(resultado.informes, filas);
    for (const llamada of llamadas) {
      assert.match(llamada.sql, /i\.estado <> 'Eliminado'/);
      assert.match(llamada.sql, /COALESCE\(i\.periodo/);
      assert.match(llamada.sql, />= :inicio/);
      assert.match(llamada.sql, /< :fin/);
      assert.doesNotMatch(llamada.sql, /idObreroEncargado|usuarioCongregacion|u\.estado|usuario_id IN/);
      assert.equal(llamada.replacements.inicio, "2026-07-01");
      assert.equal(llamada.replacements.fin, "2026-10-01");
    }
  });

  it("pagina y parametriza la búsqueda sin interpolar el texto en SQL", async () => {
    const { consultar, llamadas } = preparar(26);
    const texto = "' OR 1=1 --";
    const resultado = await consultar("2026-07-01", "2026-10-01", texto, 9, 10);
    assert.equal(resultado.pagina, 3);
    assert.equal(resultado.totalPaginas, 3);
    assert.equal(llamadas[1].replacements.offset, 20);
    assert.equal(llamadas[1].replacements.limite, 10);
    assert.equal(llamadas[1].replacements.busqueda, texto);
    assert.ok(!llamadas[1].sql.includes(texto));
  });

  it("devuelve una página vacía si no hay informes", async () => {
    const { consultar } = preparar(0);
    const resultado = await consultar("2026-07-01", "2026-10-01", "", 1, 10);
    assert.equal(resultado.total, 0);
    assert.equal(resultado.totalPaginas, 1);
    assert.equal(resultado.informes.length, 0);
  });

  it("propaga los errores de consulta para que el controlador responda con error", async () => {
    const { consultar } = preparar(0, [], true);
    await assert.rejects(consultar("2026-07-01", "2026-10-01", "", 1, 10), /consulta fallida/);
  });

  it("limita el conteo y los resultados a los responsables seleccionados", async () => {
    const { consultar, llamadas } = preparar(2);
    await consultar("2026-07-01", "2026-10-01", "", 1, 10, [8, 9]);
    for (const llamada of llamadas) {
      assert.match(llamada.sql, /i\.usuario_id IN \(:usuarios\)/);
      assert.deepEqual(llamada.replacements.usuarios, [8, 9]);
    }
  });

  it("no devuelve informes ajenos cuando el alcance no tiene responsables", async () => {
    const { consultar, llamadas } = preparar(0);
    await consultar("2026-07-01", "2026-10-01", "", 1, 10, []);
    for (const llamada of llamadas) assert.match(llamada.sql, /AND 1 = 0/);
  });
});
