import Congregacion from "../../models/congregacion.model";
import Informe from "../../models/informe.model";
import Pais from "../../models/pais.model";
import SolicitudMultimedia from "../../models/solicitudMultimedia.model";
import Usuario from "../../models/usuario.model";
import { ESTADO_INFORME_ENUM } from "../../enum/informe.enum";
import { NOTIFICACIONES_CONFIG } from "../../config/notificaciones.config";
import { DASHBOARD_SUPERVISION_CONFIG } from "../../config/dashboardSupervision.config";
import { obtenerFechaCierreInforme, obtenerPeriodoInformeActivo } from "../../helpers/periodoInforme";
import { leerFiltros, obtenerAlertas } from "../dashboardSupervision.service";
import { crearNotificaciones, crearParaUsuarios, NuevaNotificacion } from "./notificacion.service";
import {
  obtenerAdministradores,
  obtenerAprobadoresDeSolicitante,
  obtenerObrerosPais,
  obtenerResponsablesCongregacion,
  unicos,
} from "./destinatarios";

/**
 * Emisores de notificaciones por evento. Cada uno:
 *  - solo actúa sobre eventos que existen en la plataforma;
 *  - usa una `claveEvento` estable, de modo que repetirlo no duplica nada;
 *  - nunca lanza (`seguro`): una falla de notificaciones no debe romper el flujo que la origina.
 */

const MS_DIA = 86_400_000;
const ORDINALES = ["primer", "segundo", "tercer", "cuarto"];

export const seguro =
  <A extends unknown[], R>(nombre: string, accion: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R | null> => {
    try {
      return await accion(...args);
    } catch (error) {
      console.error(`[NOTIFICACIONES] Falló "${nombre}":`, error);
      return null;
    }
  };

/** "2026-07-01" -> { anio: 2026, trimestre: 3 } */
export const periodoDeFecha = (periodo: string | Date) => {
  const iso = periodo instanceof Date ? periodo.toISOString().slice(0, 10) : String(periodo).slice(0, 10);
  const [anio, mes] = iso.split("-").map(Number);
  return { anio, trimestre: Math.floor((mes - 1) / 3) + 1, iso };
};

export const nombrePeriodo = (periodo: string | Date) => {
  const { anio, trimestre } = periodoDeFecha(periodo);
  return `${ORDINALES[trimestre - 1]} trimestre de ${anio}`;
};

export const formatearFecha = (fecha: Date) =>
  new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(fecha);

const fechaCierrePeriodo = (periodo: string | Date) => {
  const { anio, trimestre } = periodoDeFecha(periodo);
  return obtenerFechaCierreInforme(trimestre, anio);
};

// ---------------------------------------------------------------- Informes

/**
 * Solo las Congregaciones Ciudad entregan informes trimestrales a efectos de notificación:
 * no se generan avisos de entrega para Campo (ni para otros tipos).
 */
const esInformeDeCiudad = (informe: any) => informe?.getDataValue("tipo_congregacion") === "CONGREGACION";

/** Confirmación para quien registra el informe, con la fecha límite real del periodo. */
export const notificarInformeCreado = seguro("informe creado", async (informeId: number) => {
  const informe = await Informe.findByPk(informeId);
  if (!informe || !esInformeDeCiudad(informe)) return 0;

  const periodo = informe.getDataValue("periodo");
  const unidad = informe.getDataValue("nombre_unidad") || "su congregación";
  return crearParaUsuarios([Number(informe.getDataValue("usuario_id"))], {
    tipo: "INFORME_REGISTRADO",
    categoria: "INFORMATIVA",
    titulo: "Informe registrado",
    mensaje: `Registró el informe de ${unidad} del ${nombrePeriodo(periodo)}. Podrá editarlo y entregarlo hasta el ${formatearFecha(fechaCierrePeriodo(periodo))}.`,
    entidadTipo: "INFORME",
    entidadId: informeId,
    urlDestino: `/sistema/ver-informe/${informeId}`,
    claveEvento: `INFORME_REGISTRADO:${informeId}`,
  });
});

/** Cierre (entrega) del informe: confirma a los responsables y avisa al Obrero País del ámbito. */
export const notificarInformeCerrado = seguro(
  "informe cerrado",
  async (informeId: number, cerradoPorUsuarioId: number | null) => {
    const informe = await Informe.findByPk(informeId);
    if (!informe || !esInformeDeCiudad(informe)) return 0;
    if (informe.getDataValue("estado") !== ESTADO_INFORME_ENUM.CERRADO) return 0;

    const congregacion = await obtenerResponsablesCongregacion(Number(informe.getDataValue("congregacion_id")));
    const unidad = informe.getDataValue("nombre_unidad") || congregacion?.nombre || "la congregación";
    const periodo = nombrePeriodo(informe.getDataValue("periodo"));
    const automatico = cerradoPorUsuarioId === null;
    const url = `/sistema/ver-informe/${informeId}`;

    const responsables = unicos(congregacion?.responsables ?? [], informe.getDataValue("usuario_id"));
    let creadas = await crearParaUsuarios(responsables, {
      tipo: automatico ? "INFORME_CERRADO_AUTOMATICO" : "INFORME_ENTREGADO",
      categoria: "INFORMATIVA",
      titulo: automatico ? "Informe cerrado automáticamente" : "Informe entregado",
      mensaje: automatico
        ? `El periodo del ${periodo} venció y el informe de ${unidad} se cerró automáticamente.`
        : `El informe de ${unidad} del ${periodo} fue cerrado y entregado correctamente.`,
      entidadTipo: "INFORME",
      entidadId: informeId,
      urlDestino: url,
      claveEvento: `INFORME_CERRADO:${informeId}`,
    });

    if (congregacion) {
      const supervisores = (await obtenerObrerosPais(congregacion.paisId)).filter(
        (id) => !responsables.includes(id),
      );
      creadas += await crearParaUsuarios(supervisores, {
        tipo: automatico ? "INFORME_CERRADO_AUTOMATICO_PAIS" : "INFORME_ENTREGADO_PAIS",
        categoria: "INFORMATIVA",
        titulo: automatico ? "Informe cerrado automáticamente" : "Informe entregado en su país",
        mensaje: automatico
          ? `El informe de ${unidad} del ${periodo} se cerró automáticamente al vencer el periodo.`
          : `${unidad} entregó el informe del ${periodo}.`,
        entidadTipo: "INFORME",
        entidadId: informeId,
        urlDestino: url,
        claveEvento: `INFORME_CERRADO_PAIS:${informeId}`,
      });
    }
    return creadas;
  },
);

/**
 * Recordatorios por informe pendiente. Solo existe una fecha límite real por periodo
 * (`obtenerFechaCierreInforme`); se avisa cuando faltan los días configurados y una única vez por umbral.
 * Pendiente = la Congregación Ciudad no tiene informe del periodo activo o aún no lo ha cerrado.
 */
export const generarRecordatoriosInformePendiente = seguro(
  "recordatorios de informe pendiente",
  async (ahora: Date = new Date()) => {
    const periodo = obtenerPeriodoInformeActivo(ahora);
    const cierre = fechaCierrePeriodo(periodo);
    const diasRestantes = Math.ceil((cierre.getTime() - ahora.getTime()) / MS_DIA);
    if (diasRestantes <= 0) return 0;

    const umbrales = NOTIFICACIONES_CONFIG.informePendiente.diasAntes.filter((d) => d >= diasRestantes);
    if (!umbrales.length) return 0;
    const umbral = Math.min(...umbrales);

    const [congregaciones, informes, paises] = await Promise.all([
      Congregacion.findAll({
        attributes: ["id", "congregacion", "pais_id", "idObreroEncargado", "idObreroEncargadoDos"],
        where: { estado: true },
      }),
      Informe.findAll({
        attributes: ["congregacion_id", "estado"],
        where: { periodo, tipo_congregacion: "CONGREGACION" },
      }),
      Pais.findAll({ attributes: ["id", "pais"], where: { estado: true } }),
    ]);
    const entregados = new Set(
      informes
        .filter((i) => i.getDataValue("estado") === ESTADO_INFORME_ENUM.CERRADO)
        .map((i) => Number(i.getDataValue("congregacion_id"))),
    );
    const nombrePais = new Map(paises.map((p) => [Number(p.getDataValue("id")), p.getDataValue("pais") as string]));

    const pendientes = congregaciones
      .filter((c) => !entregados.has(Number(c.getDataValue("id"))))
      .map((c) => ({
        id: Number(c.getDataValue("id")),
        nombre: c.getDataValue("congregacion") as string,
        paisId: Number(c.getDataValue("pais_id")),
        responsables: unicos(c.getDataValue("idObreroEncargado"), c.getDataValue("idObreroEncargadoDos")),
      }));
    if (!pendientes.length) return 0;

    const etiqueta = nombrePeriodo(periodo);
    const limite = formatearFecha(cierre);
    const plazo = diasRestantes === 1 ? "Falta 1 día" : `Faltan ${diasRestantes} días`;
    const notificaciones: NuevaNotificacion[] = [];

    // Responsables de cada Congregación Ciudad.
    for (const unidad of pendientes) {
      for (const usuarioId of unidad.responsables) {
        notificaciones.push({
          usuarioId,
          tipo: "INFORME_PENDIENTE",
          categoria: "PENDIENTE",
          titulo: "Informe pendiente de entrega",
          mensaje: `Aún no ha entregado el informe de ${unidad.nombre} del ${etiqueta}. ${plazo}: la fecha límite es el ${limite}.`,
          entidadTipo: "CONGREGACION",
          entidadId: unidad.id,
          urlDestino: "/sistema/informe",
          claveEvento: `INFORME_PENDIENTE:${unidad.id}:${periodo}:${umbral}`,
        });
      }
    }

    // Obrero País: resumen por país.
    const porPais = new Map<number, typeof pendientes>();
    for (const unidad of pendientes) porPais.set(unidad.paisId, [...(porPais.get(unidad.paisId) ?? []), unidad]);
    for (const [paisId, unidades] of porPais) {
      const supervisores = await obtenerObrerosPais(paisId);
      for (const usuarioId of supervisores) {
        notificaciones.push({
          usuarioId,
          tipo: "INFORME_PENDIENTE_PAIS",
          categoria: "PENDIENTE",
          titulo: "Informes pendientes en su país",
          mensaje: `${resumenUnidades(unidades.map((u) => u.nombre))} del país ${nombrePais.get(paisId) ?? ""} no ha(n) entregado el informe del ${etiqueta}. ${plazo}: fecha límite ${limite}.`,
          entidadTipo: "PAIS",
          entidadId: paisId,
          urlDestino: "/sistema/ver-informes-pais",
          claveEvento: `INFORME_PENDIENTE_PAIS:${paisId}:${periodo}:${umbral}`,
        });
      }
    }

    // Administración: resumen general (el detalle está en el Dashboard de Supervisión).
    for (const usuarioId of await obtenerAdministradores()) {
      notificaciones.push({
        usuarioId,
        tipo: "INFORME_PENDIENTE_ADMIN",
        categoria: "ADMINISTRATIVA",
        titulo: "Informes sin entregar",
        mensaje: `${pendientes.length} congregación(es) ciudad no ha(n) entregado el informe del ${etiqueta}. ${plazo}: fecha límite ${limite}.`,
        entidadTipo: "INFORME",
        urlDestino: "/sistema/dashboard-supervision",
        claveEvento: `INFORME_PENDIENTE_ADMIN:${periodo}:${umbral}`,
      });
    }

    return crearNotificaciones(notificaciones);
  },
);

const resumenUnidades = (nombres: string[]) => {
  const visibles = nombres.slice(0, 3).join(", ");
  return nombres.length > 3 ? `${nombres.length} congregaciones (${visibles} y otras)` : visibles;
};

// ------------------------------------------------------ Alertas de supervisión

const TITULOS_SUPERVISION: Record<string, string> = {
  DISMINUCION: "Variación a la baja en un indicador",
  INCREMENTO: "Variación al alza en un indicador",
  TENDENCIA_DISMINUCION: "Tendencia a la baja en un indicador",
  TENDENCIA_CRECIMIENTO: "Tendencia al alza en un indicador",
  ASUNTO_RECURRENTE: "Asunto pendiente recurrente",
};

/**
 * Convierte las alertas del Dashboard de Supervisión del último trimestre cerrado en notificaciones
 * administrativas. Reutiliza el motor y los umbrales del dashboard (`DASHBOARD_SUPERVISION_CONFIG.umbrales`);
 * son datos de seguimiento, sin calificaciones ni rankings. Solo para quienes pueden ver el dashboard.
 */
export const generarAlertasSupervision = seguro("alertas de supervisión", async (ahora: Date = new Date()) => {
  const activo = periodoDeFecha(obtenerPeriodoInformeActivo(ahora));
  // El periodo activo sigue abierto: se analiza el anterior, ya cerrado y con datos definitivos.
  const anterior =
    activo.trimestre === 1 ? { anio: activo.anio - 1, trimestre: 4 } : { anio: activo.anio, trimestre: activo.trimestre - 1 };

  const inicio = `${anterior.anio}-${String((anterior.trimestre - 1) * 3 + 1).padStart(2, "0")}-01`;
  if (inicio < DASHBOARD_SUPERVISION_CONFIG.inicioCobertura) return 0;

  const filtros = leerFiltros({ anio: String(anterior.anio), trimestre: String(anterior.trimestre) });
  const resultado = await obtenerAlertas(filtros);
  if (resultado.contexto.coberturaTemporal.sinCobertura) return 0;

  const alertas = resultado.alertas
    .filter((a) => !NOTIFICACIONES_CONFIG.supervision.tiposExcluidos.includes(a.tipo))
    .slice(0, NOTIFICACIONES_CONFIG.supervision.maximoPorEjecucion);
  if (!alertas.length) return 0;

  const comparacion = resultado.contexto.periodoComparacion.etiqueta;
  const url = `/sistema/dashboard-supervision?anio=${anterior.anio}&trimestre=${anterior.trimestre}`;
  const administradores = await obtenerAdministradores();

  const notificaciones: NuevaNotificacion[] = administradores.flatMap((usuarioId) =>
    alertas.map((alerta) => ({
      usuarioId,
      tipo: `SUPERVISION_${alerta.tipo}`,
      categoria: "ADMINISTRATIVA" as const,
      titulo: TITULOS_SUPERVISION[alerta.tipo] ?? "Alerta de supervisión",
      // El mensaje de la alerta ya incluye periodo actual, periodo de comparación, valores y porcentaje.
      mensaje: alerta.mensaje,
      entidadTipo: alerta.unidad.tipo,
      entidadId: alerta.unidad.id,
      urlDestino: url,
      claveEvento: `SUPERVISION:${alerta.id}:${alerta.periodo}:${comparacion}`,
    })),
  );
  return crearNotificaciones(notificaciones);
});

// ----------------------------------------------------------------- Solicitudes

const nombreCompleto = (usuario: any) =>
  ["primerNombre", "primerApellido"]
    .map((c) => usuario?.getDataValue?.(c) ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim() || "Una persona";

/** Nueva solicitud multimedia (con el correo ya verificado): avisa a los aprobadores del ámbito. */
export const notificarSolicitudNueva = seguro("solicitud nueva", async (solicitudId: number) => {
  const solicitud = await SolicitudMultimedia.findByPk(solicitudId);
  if (!solicitud) return 0;
  const solicitanteId = Number(solicitud.getDataValue("usuario_id"));
  const [solicitante, aprobadores] = await Promise.all([
    Usuario.findByPk(solicitanteId, { attributes: ["id", "primerNombre", "primerApellido"] }),
    obtenerAprobadoresDeSolicitante(solicitanteId),
  ]);
  return crearParaUsuarios(
    aprobadores.filter((id) => id !== solicitanteId),
    {
      tipo: "SOLICITUD_NUEVA",
      categoria: "SOLICITUD",
      titulo: "Nueva solicitud multimedia",
      mensaje: `${nombreCompleto(solicitante)} solicitó acceso a CMAR LIVE y está pendiente de su revisión.`,
      entidadTipo: "SOLICITUD_MULTIMEDIA",
      entidadId: solicitudId,
      urlDestino: "/sistema/solicitudes-multimedia",
      claveEvento: `SOLICITUD_NUEVA:${solicitudId}`,
    },
  );
});

const marcaMinuto = (fecha: Date) => fecha.toISOString().slice(0, 16).replace(/[-T:]/g, "");

/** Solicitud aprobada o denegada: informa a la persona que la hizo (usuario involucrado). */
export const notificarSolicitudResuelta = seguro(
  "solicitud resuelta",
  async (solicitudId: number, solicitanteId: number, estado: "APROBADA" | "DENEGADA", ahora: Date = new Date()) => {
    const aprobada = estado === "APROBADA";
    return crearParaUsuarios([solicitanteId], {
      tipo: aprobada ? "SOLICITUD_APROBADA" : "SOLICITUD_RECHAZADA",
      categoria: "SOLICITUD",
      titulo: aprobada ? "Solicitud aprobada" : "Solicitud rechazada",
      mensaje: aprobada
        ? "Su solicitud de acceso a CMAR LIVE fue aprobada."
        : "Su solicitud de acceso a CMAR LIVE fue rechazada. Si cree que es un error, comuníquese con su congregación.",
      entidadTipo: "SOLICITUD_MULTIMEDIA",
      entidadId: solicitudId,
      urlDestino: "/sistema/inicio",
      claveEvento: `SOLICITUD_${estado}:${solicitudId}:${marcaMinuto(ahora)}`,
    });
  },
);

/** Semana ISO simple (año-semana) para deduplicar el recordatorio semanal. */
export const claveSemana = (fecha: Date) => {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAnio = Date.UTC(d.getUTCFullYear(), 0, 1);
  const semana = Math.ceil(((d.getTime() - inicioAnio) / MS_DIA + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
};
