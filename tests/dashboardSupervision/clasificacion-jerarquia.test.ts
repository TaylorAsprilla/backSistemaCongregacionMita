import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clasificarActividad,
  normalizarTexto,
} from "../../src/services/dashboardSupervision/clasificacion";
import {
  CatalogoJerarquia,
  parsearFiltros,
  validarJerarquia,
} from "../../src/services/dashboardSupervision/jerarquia";
import { detectarAsuntosRecurrentes } from "../../src/services/dashboardSupervision/alertas";
import { crearAgregado, INDICADORES_POR_CLAVE } from "../../src/services/dashboardSupervision/metricas";

describe("clasificarActividad", () => {
  it("usa el día del nombre cuando existe", () => {
    assert.equal(clasificarActividad("Servicio Martes", 1), "SERVICIO_MARTES");
    assert.equal(clasificarActividad("Servicio Jueves", null), "SERVICIO_JUEVES");
    assert.equal(clasificarActividad("Servicio domingo", 4), "SERVICIO_DOMINGO");
    assert.equal(clasificarActividad("Servicio Sábado", 7), "SERVICIO_OTROS_DIAS");
  });

  it("usa el día de la fecha cuando el nombre no lo indica", () => {
    assert.equal(clasificarActividad("Servicio", 3), "SERVICIO_MARTES");
    assert.equal(clasificarActividad("Servicio", 5), "SERVICIO_JUEVES");
    assert.equal(clasificarActividad("Servicio", 1), "SERVICIO_DOMINGO");
    assert.equal(clasificarActividad("Servicio", 6), "SERVICIO_OTROS_DIAS");
  });

  it("separa consejeros y vigilias de los servicios", () => {
    assert.equal(clasificarActividad("Consejero", 3), "CONSEJERO");
    assert.equal(clasificarActividad("Vígilia Martes", 3), "VIGILIA");
    assert.equal(clasificarActividad("Vigilia", 7), "VIGILIA");
    assert.equal(clasificarActividad("Rifa", 3), "OTRA");
    assert.equal(clasificarActividad(null, 3), "OTRA");
  });

  it("normaliza textos", () => {
    assert.equal(normalizarTexto("  Reparación   del TEMPLO "), "reparacion del templo");
  });
});

describe("jerarquía de filtros", () => {
  const catalogo: CatalogoJerarquia = {
    paises: new Map([
      [1, { id: 1 }],
      [2, { id: 2 }],
    ]),
    congregaciones: new Map([
      [10, { id: 10, pais_id: 1 }],
      [20, { id: 20, pais_id: 2 }],
    ]),
    campos: new Map([
      [100, { id: 100, congregacion_id: 10 }],
      [200, { id: 200, congregacion_id: 20 }],
    ]),
  };

  it("acepta una jerarquía coherente", () => {
    assert.equal(validarJerarquia({ pais_id: 1, congregacion_id: 10, campo_id: 100 }, catalogo), null);
    assert.equal(validarJerarquia({ pais_id: null, congregacion_id: null, campo_id: null }, catalogo), null);
  });

  it("rechaza congregación de otro país", () => {
    assert.match(
      validarJerarquia({ pais_id: 1, congregacion_id: 20, campo_id: null }, catalogo) ?? "",
      /no pertenece al país/,
    );
  });

  it("rechaza campo de otra congregación", () => {
    assert.match(
      validarJerarquia({ pais_id: null, congregacion_id: 10, campo_id: 200 }, catalogo) ?? "",
      /no pertenece a la congregación/,
    );
  });

  it("rechaza campo de otro país", () => {
    assert.match(
      validarJerarquia({ pais_id: 1, congregacion_id: null, campo_id: 200 }, catalogo) ?? "",
      /no pertenece al país/,
    );
  });

  it("rechaza ids inexistentes", () => {
    assert.ok(validarJerarquia({ pais_id: 9, congregacion_id: null, campo_id: null }, catalogo));
    assert.ok(validarJerarquia({ pais_id: null, congregacion_id: null, campo_id: 999 }, catalogo));
  });
});

describe("parsearFiltros", () => {
  const activo = { anio: 2026, trimestre: 3 };

  it("usa el periodo activo por defecto", () => {
    const r = parsearFiltros({}, activo);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.valor.anio, 2026);
      assert.equal(r.valor.trimestre, 3);
      assert.equal(r.valor.comparacion, "TRIMESTRE_ANTERIOR");
    }
  });

  it("acepta `año` y valida valores", () => {
    const r = parsearFiltros({ "año": "2025", trimestre: "1", pais_id: "4" }, activo);
    assert.ok(r.ok && r.valor.anio === 2025 && r.valor.pais_id === 4);
    assert.equal(parsearFiltros({ trimestre: "5" }, activo).ok, false);
    assert.equal(parsearFiltros({ pais_id: "1 OR 1=1" }, activo).ok, false);
    assert.equal(parsearFiltros({ comparacion: "OTRO" }, activo).ok, false);
  });
});

describe("asuntos recurrentes", () => {
  it("detecta el mismo asunto en 3 trimestres consecutivos", () => {
    const r = detectarAsuntosRecurrentes(
      [["Otro"], ["Reparar techo"], ["reparar  TECHO"], ["Reparar techo", "Nuevo"]],
      3,
    );
    assert.deepEqual(r, [{ asunto: "Reparar techo", trimestres: 3 }]);
  });

  it("un trimestre sin informe interrumpe la recurrencia", () => {
    assert.deepEqual(detectarAsuntosRecurrentes([["A"], null, ["A"], ["A"]], 3), []);
  });
});

describe("indicadores", () => {
  it("una sección sin registros es null y no 0", () => {
    const ag = { ...crearAgregado(), informes: 1 };
    assert.equal(INDICADORES_POR_CLAVE.get("asistenciaGeneral")!.extraer(ag), null);
    assert.equal(INDICADORES_POR_CLAVE.get("logros")!.extraer(ag), 0);
  });

  it("sin informes todo es null", () => {
    assert.equal(INDICADORES_POR_CLAVE.get("logros")!.extraer(crearAgregado()), null);
  });

  it("la asistencia general suma sólo servicios", () => {
    const ag = {
      ...crearAgregado(),
      informes: 1,
      secciones: { act: 1, vis: 0 },
      valores: {
        "act.SERVICIO_MARTES.asistencia": 40,
        "act.SERVICIO_MARTES.cantidad": 2,
        "act.SERVICIO_DOMINGO.asistencia": 60,
        "act.SERVICIO_DOMINGO.cantidad": 2,
        "act.CONSEJERO.asistencia": 500,
        "act.CONSEJERO.cantidad": 1,
      },
    };
    assert.equal(INDICADORES_POR_CLAVE.get("asistenciaGeneral")!.extraer(ag), 100);
    assert.equal(INDICADORES_POR_CLAVE.get("promedioAsistenciaServicio")!.extraer(ag), 25);
  });
});
