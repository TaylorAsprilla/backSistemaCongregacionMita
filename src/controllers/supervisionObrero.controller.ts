import { Request, Response } from "express";
import {
  ErrorDashboard,
  leerFiltros,
  obtenerAlertas,
  obtenerDetalleUnidad,
  obtenerFiltrosDisponibles,
  obtenerResumen,
  obtenerTendencias,
  obtenerUnidades,
} from "../services/dashboardSupervision.service";
import { FiltrosDisponiblesDTO, TipoUnidad } from "../types/dashboardSupervision.dto";
import {
  ContextoObrero,
  UnidadObreroAsignada,
} from "../services/supervisionObrero.authorization";
import { RequestSupervisionObrero } from "../middlewares/validar-supervision-obrero";
import Campo from "../models/campo.model";

const contextoDe = (req: Request) =>
  (req as RequestSupervisionObrero).contextoObrero;

const unidadAsignada = (contexto: ContextoObrero, tipo: TipoUnidad, id: number) =>
  contexto.unidades.some((unidad) => unidad.tipo === tipo && unidad.id === id);

const manejar =
  (accion: (req: Request, contexto: ContextoObrero) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      const contexto = contextoDe(req);
      if (!contexto) throw new ErrorDashboard("No se encontró el alcance asignado.", 403);
      const datos = await accion(req, contexto);
      return res.json({ ok: true, ...(datos as object) });
    } catch (error) {
      if (error instanceof ErrorDashboard) {
        return res.status(error.status).json({ ok: false, msg: error.message });
      }
      console.error("[SUPERVISION-OBRERO]", error);
      return res.status(500).json({
        ok: false,
        msg: "No fue posible obtener el dashboard de la congregación.",
      });
    }
  };

const leerFiltrosObrero = (req: Request, contexto: ContextoObrero) => {
  const filtros = leerFiltros(req.query);
  if (filtros.pais_id !== null) {
    throw new ErrorDashboard("El alcance debe limitarse a una unidad asignada.", 403);
  }

  const seleccionadas: UnidadObreroAsignada[] = [];
  if (filtros.congregacion_id !== null) {
    seleccionadas.push({ tipo: "CONGREGACION", id: filtros.congregacion_id });
  }
  if (filtros.campo_id !== null) {
    seleccionadas.push({ tipo: "CAMPO", id: filtros.campo_id });
  }
  if (
    seleccionadas.length !== 1 ||
    !unidadAsignada(contexto, seleccionadas[0].tipo, seleccionadas[0].id)
  ) {
    throw new ErrorDashboard("Seleccione una de sus unidades asignadas.", 403);
  }

  return filtros;
};

export const getFiltrosSupervisionObrero = manejar(async (_req, contexto) => {
  const filtros = await obtenerFiltrosDisponibles();
  const ciudades = new Set(
    contexto.unidades
      .filter((unidad) => unidad.tipo === "CONGREGACION")
      .map((unidad) => unidad.id),
  );
  const campos = new Set(
    contexto.unidades
      .filter((unidad) => unidad.tipo === "CAMPO")
      .map((unidad) => unidad.id),
  );

  const resultado: FiltrosDisponiblesDTO = {
    ...filtros,
    paises: [],
    congregaciones: filtros.congregaciones.filter((unidad) => ciudades.has(unidad.id)),
    campos: filtros.campos.filter((unidad) => campos.has(unidad.id)),
  };
  return { filtros: resultado };
});

export const getResumenSupervisionObrero = manejar(async (req, contexto) => ({
  resumen: await obtenerResumen(leerFiltrosObrero(req, contexto)),
}));

export const getTendenciasSupervisionObrero = manejar(async (req, contexto) => ({
  tendencias: await obtenerTendencias(leerFiltrosObrero(req, contexto)),
}));

export const getAlertasSupervisionObrero = manejar(async (req, contexto) => ({
  alertas: await obtenerAlertas(leerFiltrosObrero(req, contexto), {
    tipo: typeof req.query.tipo === "string" ? req.query.tipo.trim() : undefined,
    nivel: typeof req.query.nivel === "string" ? req.query.nivel.trim() : undefined,
  }),
}));

const enteroPositivo = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
};

export const getUnidadesSupervisionObrero = manejar(async (req, contexto) => ({
  unidades: await obtenerUnidades(leerFiltrosObrero(req, contexto), {
    busqueda: typeof req.query.busqueda === "string" ? req.query.busqueda.trim() : undefined,
    tipo: typeof req.query.tipo === "string" ? req.query.tipo.trim() : undefined,
    estado: typeof req.query.estado === "string" ? req.query.estado.trim() : undefined,
    orden: typeof req.query.orden === "string" ? req.query.orden.trim() : undefined,
    servicio: typeof req.query.servicio === "string" ? req.query.servicio.trim() : undefined,
    variacion: typeof req.query.variacion === "string" ? req.query.variacion.trim() : undefined,
    pagina: enteroPositivo(req.query.pagina),
    porPagina: enteroPositivo(req.query.porPagina),
  }),
}));

export const getDetalleUnidadSupervisionObrero = manejar(async (req, contexto) => {
  const tipo = String(req.params.tipo).toUpperCase() as TipoUnidad;
  const id = Number(req.params.id);
  const filtros = leerFiltrosObrero(req, contexto);
  let perteneceAlAlcance = unidadAsignada(contexto, tipo, id);
  if (tipo === "CAMPO" && !perteneceAlAlcance && filtros.congregacion_id !== null) {
    const campo = await Campo.findByPk(id, { attributes: ["congregacion_id"] });
    perteneceAlAlcance =
      Number(campo?.getDataValue("congregacion_id")) === filtros.congregacion_id;
  }
  if (
    !["CONGREGACION", "CAMPO"].includes(tipo) ||
    !Number.isInteger(id) ||
    !perteneceAlAlcance
  ) {
    throw new ErrorDashboard("La unidad no existe o no está asignada al usuario.", 404);
  }
  const coincideConSeleccion =
    (tipo === "CONGREGACION" && filtros.congregacion_id === id) ||
    (tipo === "CAMPO" && filtros.campo_id === id);
  if (!coincideConSeleccion) {
    throw new ErrorDashboard("Seleccione la unidad asignada que desea consultar.", 403);
  }

  return {
    detalle: await obtenerDetalleUnidad(filtros, tipo, id),
  };
});
