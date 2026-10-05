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

const texto = (valor: unknown) =>
  typeof valor === "string" && valor.trim() ? valor.trim() : undefined;

const entero = (valor: unknown) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};

const manejar =
  (accion: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      const datos = await accion(req);
      res.json({ ok: true, ...(datos as object) });
    } catch (error) {
      if (error instanceof ErrorDashboard) {
        return res.status(error.status).json({ ok: false, msg: error.message });
      }
      console.error("[DASHBOARD-SUPERVISION]", error);
      res.status(500).json({
        ok: false,
        msg: "No fue posible obtener la información del dashboard. Intente nuevamente.",
      });
    }
  };

export const getFiltros = manejar(async () => ({ filtros: await obtenerFiltrosDisponibles() }));

export const getResumen = manejar(async (req) => ({
  resumen: await obtenerResumen(leerFiltros(req.query)),
}));

export const getTendencias = manejar(async (req) => ({
  tendencias: await obtenerTendencias(leerFiltros(req.query)),
}));

export const getAlertas = manejar(async (req) => ({
  alertas: await obtenerAlertas(leerFiltros(req.query), {
    tipo: texto(req.query.tipo),
    nivel: texto(req.query.nivel),
  }),
}));

export const getUnidades = manejar(async (req) => ({
  unidades: await obtenerUnidades(leerFiltros(req.query), {
    busqueda: texto(req.query.busqueda),
    tipo: texto(req.query.tipo),
    estado: texto(req.query.estado),
    orden: texto(req.query.orden),
    servicio: texto(req.query.servicio),
    variacion: texto(req.query.variacion),
    pagina: entero(req.query.pagina),
    porPagina: entero(req.query.porPagina),
  }),
}));

export const getDetalleUnidad = manejar(async (req) => ({
  detalle: await obtenerDetalleUnidad(
    leerFiltros(req.query),
    String(req.params.tipo).toUpperCase(),
    Number(req.params.id),
  ),
}));
