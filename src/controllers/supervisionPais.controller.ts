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
import { CustomRequest } from "../middlewares/validar-jwt";
import { FiltrosDisponiblesDTO, TipoUnidad } from "../types/dashboardSupervision.dto";
import { paisPerteneceAlAlcance } from "../services/supervisionPais.scope";

const paisIdDe = (req: Request) => (req as CustomRequest).paisSupervisionId;

const obtenerFiltrosPais = async (paisId: number): Promise<FiltrosDisponiblesDTO> => {
  const filtros = await obtenerFiltrosDisponibles();
  const congregaciones = filtros.congregaciones.filter((congregacion) => congregacion.pais_id === paisId);
  const idsCongregaciones = new Set(congregaciones.map((congregacion) => congregacion.id));

  return {
    ...filtros,
    paises: filtros.paises.filter((pais) => pais.id === paisId),
    congregaciones,
    campos: filtros.campos.filter(
      (campo) => campo.congregacion_id != null && idsCongregaciones.has(campo.congregacion_id),
    ),
  };
};

const leerFiltrosPais = (req: Request) => {
  const paisAsignado = paisIdDe(req);
  if (!paisAsignado) throw new ErrorDashboard("No se encontró el país asignado.", 403);

  const filtros = leerFiltros(req.query);
  if (filtros.pais_id !== null && !paisPerteneceAlAlcance(filtros.pais_id, [paisAsignado])) {
    throw new ErrorDashboard("No tiene permiso para consultar información de ese país.", 403);
  }
  return { ...filtros, pais_id: paisAsignado };
};

const manejar =
  (accion: (req: Request, paisId: number) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      const paisId = paisIdDe(req);
      if (!paisId) throw new ErrorDashboard("No se encontró el país asignado.", 403);
      const datos = await accion(req, paisId);
      return res.json({ ok: true, ...(datos as object) });
    } catch (error) {
      if (error instanceof ErrorDashboard) {
        return res.status(error.status).json({ ok: false, msg: error.message });
      }
      console.error("[SUPERVISION-PAIS]", error);
      return res.status(500).json({
        ok: false,
        msg: "No fue posible obtener la información de supervisión.",
      });
    }
  };

export const getFiltrosSupervisionPais = manejar(async (_req, paisId) => ({
  filtros: await obtenerFiltrosPais(paisId),
}));

export const getResumenSupervisionPais = manejar(async (req) => ({
  resumen: await obtenerResumen(leerFiltrosPais(req)),
}));

export const getTendenciasSupervisionPais = manejar(async (req) => ({
  tendencias: await obtenerTendencias(leerFiltrosPais(req)),
}));

export const getAlertasSupervisionPais = manejar(async (req) => ({
  alertas: await obtenerAlertas(leerFiltrosPais(req), {
    tipo: typeof req.query.tipo === "string" ? req.query.tipo.trim() : undefined,
    nivel: typeof req.query.nivel === "string" ? req.query.nivel.trim() : undefined,
  }),
}));

const enteroPositivo = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
};

export const getUnidadesSupervisionPais = manejar(async (req) => ({
  unidades: await obtenerUnidades(leerFiltrosPais(req), {
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

export const getDetalleUnidadSupervisionPais = manejar(async (req, paisId) => {
  const tipo = String(req.params.tipo).toUpperCase() as TipoUnidad;
  const id = Number(req.params.id);
  const catalogo = await obtenerFiltrosPais(paisId);
  const pertenece =
    tipo === "PAIS"
      ? id === paisId
      : tipo === "CONGREGACION"
        ? catalogo.congregaciones.some((congregacion) => congregacion.id === id)
        : tipo === "CAMPO"
          ? catalogo.campos.some((campo) => campo.id === id)
          : false;

  if (!pertenece) {
    throw new ErrorDashboard("La unidad solicitada no existe o no pertenece al país asignado.", 404);
  }

  return {
    detalle: await obtenerDetalleUnidad(leerFiltrosPais(req), tipo, id),
  };
});
