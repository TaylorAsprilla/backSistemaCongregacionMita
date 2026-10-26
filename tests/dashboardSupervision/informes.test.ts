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
  return { consultar, llamadas, consultas: exports as typeof Consultas };
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
    for (const columna of ["tipo_congregacion", "congregacion_id", "nombre_pais", "nombre_congregacion", "nombre_campo"]) {
      assert.ok(llamadas[1].sql.includes(`i.${columna}`));
    }
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

  describe("consultas del dataset de supervision", () => {
    it("cuenta legados globales agrupando la expresion seleccionada para ONLY_FULL_GROUP_BY", async () => {
      const { consultas, llamadas } = preparar(0);
      await consultas.obtenerInformesSinAmbito("2026-07-01", "2027-01-01");
      assert.match(llamadas[0].sql, /i\.tipo_congregacion IS NULL OR i\.congregacion_id IS NULL/);
      assert.match(llamadas[0].sql, /i\.estado <> 'Eliminado'/);
      assert.ok(llamadas[0].sql.includes(`GROUP BY DATE_FORMAT(${consultas.SQL_PERIODO_INFORME}, '%Y-%m-%d')`));
      assert.doesNotMatch(llamadas[0].sql, /usuario_id IN/);
    });

    it("selecciona por ambito aunque la unidad no tenga responsable actual", async () => {
      const { consultas, llamadas } = preparar(0);
      await consultas.obtenerInformes([], "2026-07-01", "2027-01-01", [{ tipo: "CONGREGACION", id: 59 }]);
      assert.equal(llamadas.length, 1);
      assert.match(llamadas[0].sql, /i\.tipo_congregacion = :tipo0/);
      assert.match(llamadas[0].sql, /i\.congregacion_id = :unidad0/);
      assert.doesNotMatch(llamadas[0].sql, /usuario_id IN/);
      assert.equal(llamadas[0].replacements.tipo0, "CONGREGACION");
      assert.equal(llamadas[0].replacements.unidad0, 59);
    });

    it("usa el mes de la actividad, no la fecha de creacion del informe", async () => {
      const { consultas, llamadas } = preparar(0);
      await consultas.obtenerActividades([113]);
      assert.match(llamadas[0].sql, /DATE_FORMAT\(a\.fecha, '%Y-%m'\) AS mes/);
      assert.match(llamadas[0].sql, /GROUP BY a\.informe_id, DATE_FORMAT\(a\.fecha, '%Y-%m'\)/);
      assert.doesNotMatch(llamadas[0].sql, /createdAt/);
    });
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
