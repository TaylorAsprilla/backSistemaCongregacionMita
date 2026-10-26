import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import type * as Servicio from "../../src/services/dashboardSupervision.service";
import { coberturaTemporal } from "../../src/services/dashboardSupervision/periodos";
import type { FiltrosDashboard } from "../../src/types/dashboardSupervision.dto";

const filtros: FiltrosDashboard = {
  anio: 2026, trimestre: 4, pais_id: null, congregacion_id: null, campo_id: null,
  comparacion: "TRIMESTRE_ANTERIOR",
};

const preparar = (estadoActual = "Abierto", fecha = "2026-10-24T15:00:00Z") => {
  const ruta = require.resolve("../../src/services/dashboardSupervision.service");
  const cargar = createRequire(ruta);
  const exports: Partial<typeof Servicio> = {};
  const informes = [
    { id: 112, usuario_id: 2952, tipo_congregacion: "PAIS", congregacion_id: 43, periodo: "2026-10-01", estado: estadoActual },
    { id: 113, usuario_id: 2952, tipo_congregacion: "CONGREGACION", congregacion_id: 59, periodo: "2026-10-01", estado: estadoActual },
    { id: 80, usuario_id: 999, tipo_congregacion: "CONGREGACION", congregacion_id: 59, periodo: "2026-07-01", estado: "Cerrado" },
    { id: 95, usuario_id: 2952, tipo_congregacion: null, congregacion_id: null, periodo: "2026-10-01", estado: "Abierto" },
  ];
  const actividades = [
    { informe_id: 112, mes: "2026-10", nombre: "Servicio", diaSemana: 1, cantidad: 1, asistencia: 200 },
    { informe_id: 113, mes: "2026-10", nombre: "Servicio", diaSemana: 1, cantidad: 2, asistencia: 40 },
    { informe_id: 80, mes: "2026-09", nombre: "Servicio", diaSemana: 1, cantidad: 1, asistencia: 30 },
    { informe_id: 95, mes: "2026-10", nombre: "Servicio", diaSemana: 1, cantidad: 1, asistencia: 900 },
    { informe_id: 113, mes: "2026-10", nombre: "Vigilia", diaSemana: 1, cantidad: 1, asistencia: 500 },
  ];
  let ambitosConsultados: unknown;
  const sinAmbito: { periodo: string; cantidad: number }[] = [];
  const FechaReal = Date;
  class FechaFija extends FechaReal {
    constructor(value?: string | number) { super(value ?? fecha); }
    static now() { return new FechaReal(fecha).getTime(); }
  }
  runInNewContext(readFileSync(ruta, "utf8"), {
    exports, console, Date: FechaFija,
    require: (nombre: string) => nombre === "./dashboardSupervision/consultas" ? {
      obtenerPaises: async () => [
        { id: 43, nombre: "Chile", obreros: [2952] },
        { id: 2, nombre: "Colombia", obreros: [] },
      ],
      obtenerCongregaciones: async () => [
        { id: 59, nombre: "Tulua", pais_id: 2, obreros: [2952, 10] },
        { id: 60, nombre: "Otra ciudad", pais_id: 2, obreros: [11] },
      ],
      obtenerCampos: async () => [],
      obtenerCategoriasEspirituales: async () => [],
      obtenerUsuarios: async () => [],
      obtenerInformesSinAmbito: async () => sinAmbito,
      obtenerInformes: async (_ids: number[], _inicio: string, _fin: string, ambitos: unknown) => {
        ambitosConsultados = ambitos;
        return informes;
      },
      obtenerActividades: async () => actividades,
      obtenerVisitas: async () => [],
      obtenerConteos: async () => [],
      obtenerAsuntos: async () => [],
    } : nombre === "./dashboardSupervision/periodos" ? {
      ...cargar(nombre),
      coberturaTemporal: (p: Parameters<typeof coberturaTemporal>[0], c: Parameters<typeof coberturaTemporal>[1], inicio: string) =>
        coberturaTemporal(p, c, inicio, new Date(fecha)),
    } : cargar(nombre),
  });
  return {
    servicio: exports as typeof Servicio, informes, actividades, sinAmbito,
    ambitos: () => JSON.parse(JSON.stringify(ambitosConsultados)),
  };
};

test("cobertura: Q3 2026 es completo, Q2 y comparacion anual no tienen historial", () => {
  const fecha = new Date("2026-10-24T15:00:00Z");
  assert.equal(coberturaTemporal({ anio: 2026, trimestre: 3 }, { anio: 2026, trimestre: 2 }, "2026-07-01", fecha).sinCobertura, false);
  assert.equal(coberturaTemporal({ anio: 2026, trimestre: 2 }, { anio: 2026, trimestre: 1 }, "2026-07-01", fecha).sinCobertura, true);
  assert.equal(coberturaTemporal({ anio: 2026, trimestre: 4 }, { anio: 2026, trimestre: 3 }, "2026-07-01", fecha).comparable, false);
  assert.equal(coberturaTemporal({ anio: 2026, trimestre: 3 }, { anio: 2025, trimestre: 3 }, "2026-07-01", fecha).comparable, false);
  assert.equal(coberturaTemporal({ anio: 2026, trimestre: 4 }, { anio: 2026, trimestre: 3 }, "2026-07-01", new Date("2027-01-01T05:00:00Z")).comparable, true);
});

test("cada informe aporta solo a su Congregacion, sin duplicarse por dos responsables", async () => {
  const { servicio, ambitos } = preparar();
  const listado = await servicio.obtenerUnidades(filtros);
  const ciudad = listado.unidades.find((u) => u.unidad.id === 59)!;
  const pais = listado.unidades.find((u) => u.unidad.id === 43)!;
  assert.equal(ciudad.informes, 1);
  assert.equal(pais.informes, 1);
  assert.equal(ciudad.estadoEntrega, "EN_ELABORACION");
  assert.ok(ambitos().some((a: { tipo: string; id: number }) => a.tipo === "CONGREGACION" && a.id === 59));
  const resumen = await servicio.obtenerResumen(filtros);
  assert.equal(resumen.indicadores.find((i) => i.clave === "asistenciaGeneral")!.valorPeriodo, 40);
  assert.equal(resumen.cobertura.informesPeriodo, 1);
  assert.equal(resumen.cobertura.porcentajeConInforme, 50);
  assert.equal(resumen.cobertura.porcentajeEntregado, 0);
  assert.equal(resumen.cobertura.unidadesComparadas, 0);
  assert.ok(resumen.indicadores.every((i) => i.variacion.porcentaje === null));
  const historico = await servicio.obtenerTendencias(filtros);
  assert.equal(historico.periodos.length, 2);
  const mensual = historico.seriesMensuales.find((s) => s.clave === "asistenciaMensual")!;
  assert.deepEqual(JSON.parse(JSON.stringify(mensual.puntos)), [
    { periodo: "2026-07", valor: null }, { periodo: "2026-08", valor: null },
    { periodo: "2026-09", valor: 30 }, { periodo: "2026-10", valor: 40 },
  ]);
  const alertas = await servicio.obtenerAlertas(filtros);
  assert.ok(alertas.alertas.every((a) => a.tipo !== "DISMINUCION" && a.tipo !== "INCREMENTO"));
});

test("un informe cerrado incrementa entrega sin convertir el trimestre en curso en comparable", async () => {
  const { servicio } = preparar("Cerrado");
  const resumen = await servicio.obtenerResumen(filtros);
  assert.equal(resumen.cobertura.porcentajeEntregado, 50);
  assert.equal(resumen.cobertura.entregados, 1);
  assert.equal(resumen.cobertura.unidadesComparadas, 0);
});

test("compara solo informes cerrados y la misma base con datos por indicador", async () => {
  const { servicio, informes, actividades } = preparar("Cerrado", "2027-01-15T15:00:00Z");
  informes.push(
    { id: 140, usuario_id: 11, tipo_congregacion: "CONGREGACION", congregacion_id: 60, periodo: "2026-10-01", estado: "Cerrado" },
    { id: 141, usuario_id: 11, tipo_congregacion: "CONGREGACION", congregacion_id: 60, periodo: "2026-07-01", estado: "Cerrado" },
  );
  actividades.push({ informe_id: 140, mes: "2026-10", nombre: "Servicio", diaSemana: 1, cantidad: 1, asistencia: 1000 });
  const resumen = await servicio.obtenerResumen(filtros);
  const asistencia = resumen.indicadores.find((i) => i.clave === "asistenciaGeneral")!;
  // La otra ciudad no tiene servicios previos: visible en el total, fuera de la variación.
  assert.equal(asistencia.valorPeriodo, 1040);
  assert.equal(asistencia.variacion.anterior, 30);
  assert.equal(asistencia.variacion.actual, 40);
  assert.equal(asistencia.variacion.porcentaje, 33.33);
  assert.equal(resumen.cobertura.unidadesComparadas, 2);
});

test("periodos sin cobertura no se presentan como cero actividad ni generan pendientes", async () => {
  const { servicio } = preparar();
  const seleccion = { ...filtros, trimestre: 2 };
  const resumen = await servicio.obtenerResumen(seleccion);
  assert.equal(resumen.contexto.coberturaTemporal.sinCobertura, true);
  assert.equal(resumen.cobertura.porcentajeConInforme, null);
  assert.equal(resumen.cobertura.porcentajeEntregado, null);
  assert.ok(resumen.indicadores.every((i) => i.valorPeriodo === null));
  assert.equal((await servicio.obtenerAlertas(seleccion)).alertas.length, 0);
  const tendencias = await servicio.obtenerTendencias(seleccion);
  assert.equal(tendencias.periodos.length, 0);
  assert.ok(tendencias.seriesMensuales.every((s) => s.puntos.length === 0));
});

test("advierte legados excluidos y no calcula entrega ni crecimiento con historico por conciliar", async () => {
  const { servicio, sinAmbito } = preparar("Cerrado", "2027-01-15T15:00:00Z");
  sinAmbito.push({ periodo: "2026-07-01", cantidad: 66 });
  const actual = await servicio.obtenerResumen(filtros);
  assert.equal(actual.contexto.integridad.informesSinAmbitoComparacion, 66);
  assert.equal(actual.contexto.integridad.informesSinAmbitoHistorico, 66);
  assert.equal(actual.contexto.coberturaTemporal.comparable, false);
  assert.equal(actual.cobertura.unidadesComparadas, 0);
  assert.ok(actual.indicadores.every((i) => i.variacion.porcentaje === null));
  const historico = { ...filtros, trimestre: 3 };
  const previo = await servicio.obtenerResumen(historico);
  assert.equal(previo.contexto.integridad.informesSinAmbitoPeriodo, 66);
  assert.equal(previo.cobertura.porcentajeConInforme, null);
  assert.equal(previo.cobertura.porcentajeEntregado, null);
  assert.equal((await servicio.obtenerAlertas(historico)).alertas.length, 0);
});
