import { createHash } from "crypto";
import { Op } from "sequelize";
import db from "../../database/connection";
import Notificacion, { CATEGORIAS_NOTIFICACION, CategoriaNotificacion } from "../../models/notificacion.model";
import { NOTIFICACIONES_CONFIG } from "../../config/notificaciones.config";
import { DASHBOARD_SUPERVISION_CONFIG } from "../../config/dashboardSupervision.config";
import { obtenerPermisosUsuario } from "../dashboardSupervision/consultas";

export interface NuevaNotificacion {
  usuarioId: number;
  tipo: string;
  categoria: CategoriaNotificacion;
  titulo: string;
  mensaje: string;
  entidadTipo?: string | null;
  entidadId?: number | null;
  /** Ruta interna de la aplicación (debe comenzar con /sistema/). */
  urlDestino?: string | null;
  /** Identifica el evento: la misma clave para el mismo usuario nunca se crea dos veces. */
  claveEvento: string;
  expiraEn?: Date | null;
}

export interface FiltroNotificaciones {
  estado?: "todas" | "leidas" | "no-leidas";
  categoria?: string;
  pagina?: number;
  porPagina?: number;
}

export class NotificacionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "NotificacionError";
  }
}

const LOTE = 200;

const recortar = (texto: string, max: number) =>
  texto.length <= max ? texto : `${texto.slice(0, max - 1).trimEnd()}…`;

/** Solo rutas internas: evita redirecciones abiertas si algún emisor construyera mal la URL. */
export const sanitizarUrlDestino = (url: unknown): string | null =>
  typeof url === "string" && /^\/sistema\/[A-Za-z0-9\-_/?=&%.]*$/.test(url) && url.length <= 255 ? url : null;

/** Claves demasiado largas se reducen a un hash estable. */
export const normalizarClaveEvento = (clave: string): string =>
  clave.length <= 191 ? clave : `${clave.slice(0, 100)}#${createHash("sha1").update(clave).digest("hex")}`;

const esEntero = (valor: unknown): valor is number => Number.isInteger(valor) && (valor as number) > 0;

const aFila = (n: NuevaNotificacion) => [
  n.usuarioId,
  recortar(n.tipo, 50),
  n.categoria,
  recortar(n.titulo, 150),
  recortar(n.mensaje, 500),
  n.entidadTipo ? recortar(n.entidadTipo, 30) : null,
  esEntero(n.entidadId) ? n.entidadId : null,
  sanitizarUrlDestino(n.urlDestino),
  normalizarClaveEvento(n.claveEvento),
  n.expiraEn ?? null,
];

const validar = (n: NuevaNotificacion): boolean =>
  esEntero(n.usuarioId) &&
  !!n.tipo &&
  !!n.titulo &&
  !!n.mensaje &&
  !!n.claveEvento &&
  (CATEGORIAS_NOTIFICACION as readonly string[]).includes(n.categoria);

/**
 * Crea notificaciones evitando duplicados (índice único usuario + evento, INSERT IGNORE).
 * @returns cuántas se crearon realmente (las repetidas no cuentan).
 */
export const crearNotificaciones = async (notificaciones: NuevaNotificacion[]): Promise<number> => {
  const validas = notificaciones.filter(validar);
  let creadas = 0;
  for (let i = 0; i < validas.length; i += LOTE) {
    const lote = validas.slice(i, i + LOTE);
    const marcadores = lote.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const [, afectadas] = (await db.query(
      `INSERT IGNORE INTO notificacion
         (usuario_id, tipo, categoria, titulo, mensaje, entidad_tipo, entidad_id, url_destino, clave_evento, fecha_expiracion)
       VALUES ${marcadores}`,
      { replacements: lote.flatMap(aFila) },
    )) as unknown as [unknown, number];
    creadas += Number(afectadas) || 0;
  }
  return creadas;
};

/** Misma notificación para varios usuarios (se descartan ids repetidos o inválidos). */
export const crearParaUsuarios = async (
  usuarioIds: number[],
  datos: Omit<NuevaNotificacion, "usuarioId">,
): Promise<number> => {
  const ids = [...new Set(usuarioIds.filter(esEntero))];
  return crearNotificaciones(ids.map((usuarioId) => ({ ...datos, usuarioId })));
};

/** Las alertas administrativas solo se ven mientras el usuario conserve un permiso autorizado. */
export const puedeVerAdministrativas = async (usuarioId: number): Promise<boolean> => {
  const permisos = await obtenerPermisosUsuario(usuarioId);
  return permisos.some((p) => DASHBOARD_SUPERVISION_CONFIG.rolesAutorizados.includes(p));
};

const condicionBase = async (usuarioId: number) => {
  const visibles = (await puedeVerAdministrativas(usuarioId))
    ? [...CATEGORIAS_NOTIFICACION]
    : CATEGORIAS_NOTIFICACION.filter((c) => c !== "ADMINISTRATIVA");
  return {
    usuario_id: usuarioId,
    categoria: { [Op.in]: visibles },
    [Op.or]: [{ fecha_expiracion: null }, { fecha_expiracion: { [Op.gt]: new Date() } }],
  };
};

export const aDto = (fila: any) => ({
  id: Number(fila.getDataValue("id")),
  tipo: fila.getDataValue("tipo") as string,
  categoria: fila.getDataValue("categoria") as string,
  titulo: fila.getDataValue("titulo") as string,
  mensaje: fila.getDataValue("mensaje") as string,
  entidadTipo: (fila.getDataValue("entidad_tipo") ?? null) as string | null,
  entidadId: (fila.getDataValue("entidad_id") ?? null) as number | null,
  urlDestino: (fila.getDataValue("url_destino") ?? null) as string | null,
  leida: Boolean(fila.getDataValue("leida")),
  fechaLectura: fila.getDataValue("fecha_lectura") ?? null,
  fechaCreacion: fila.getDataValue("fecha_creacion"),
});

export const contarNoLeidas = async (usuarioId: number): Promise<number> =>
  Notificacion.count({ where: { ...(await condicionBase(usuarioId)), leida: false } as any });

export const listar = async (usuarioId: number, filtro: FiltroNotificaciones = {}) => {
  const porPagina = Math.min(
    Math.max(Math.floor(Number(filtro.porPagina)) || NOTIFICACIONES_CONFIG.paginacion.porPaginaDefecto, 1),
    NOTIFICACIONES_CONFIG.paginacion.porPaginaMaximo,
  );
  const pagina = Math.max(Math.floor(Number(filtro.pagina)) || 1, 1);

  const base = await condicionBase(usuarioId);
  const where: Record<string | symbol, unknown> = { ...base };
  if (filtro.estado === "leidas") where.leida = true;
  if (filtro.estado === "no-leidas") where.leida = false;
  if (filtro.categoria) {
    if (!(CATEGORIAS_NOTIFICACION as readonly string[]).includes(filtro.categoria)) {
      throw new NotificacionError("CATEGORIA_INVALIDA", "La categoría indicada no es válida.", 400);
    }
    // Se respeta la visibilidad: pedir ADMINISTRATIVA sin permiso devuelve vacío.
    const visibles = base.categoria[Op.in] as string[];
    where.categoria = { [Op.in]: visibles.filter((c) => c === filtro.categoria) };
  }

  const { rows, count } = await Notificacion.findAndCountAll({
    where: where as any,
    order: [
      ["fecha_creacion", "DESC"],
      ["id", "DESC"],
    ],
    limit: porPagina,
    offset: (pagina - 1) * porPagina,
  });

  return {
    total: count,
    pagina,
    porPagina,
    totalPaginas: Math.max(Math.ceil(count / porPagina), 1),
    noLeidas: await contarNoLeidas(usuarioId),
    notificaciones: rows.map(aDto),
  };
};

/**
 * Marca como leída una notificación del propio usuario.
 * Si no existe o es de otro usuario responde igual (404): no revela que el id existe.
 */
export const marcarLeida = async (usuarioId: number, id: number): Promise<void> => {
  const [afectadas] = await Notificacion.update(
    { leida: true, fecha_lectura: new Date() },
    { where: { id, usuario_id: usuarioId, leida: false } },
  );
  if (afectadas > 0) return;
  const existe = await Notificacion.count({ where: { id, usuario_id: usuarioId } });
  if (!existe) {
    throw new NotificacionError("NOTIFICACION_NO_ENCONTRADA", "Notificación no encontrada.", 404);
  }
};

export const marcarTodasLeidas = async (usuarioId: number, categoria?: string): Promise<number> => {
  const where: Record<string, unknown> = { usuario_id: usuarioId, leida: false };
  if (categoria) {
    if (!(CATEGORIAS_NOTIFICACION as readonly string[]).includes(categoria)) {
      throw new NotificacionError("CATEGORIA_INVALIDA", "La categoría indicada no es válida.", 400);
    }
    where.categoria = categoria;
  } else if (!(await puedeVerAdministrativas(usuarioId))) {
    where.categoria = { [Op.ne]: "ADMINISTRATIVA" };
  }
  const [afectadas] = await Notificacion.update({ leida: true, fecha_lectura: new Date() }, { where: where as any });
  return afectadas;
};

export const eliminar = async (usuarioId: number, id: number): Promise<void> => {
  const borradas = await Notificacion.destroy({ where: { id, usuario_id: usuarioId } });
  if (!borradas) {
    throw new NotificacionError("NOTIFICACION_NO_ENCONTRADA", "Notificación no encontrada.", 404);
  }
};

/** Política de conservación (tarea diaria): borra expiradas y las muy antiguas. */
export const depurar = async (ahora: Date = new Date()): Promise<number> => {
  const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000);
  const { leidasDias, noLeidasDias } = NOTIFICACIONES_CONFIG.retencion;
  return Notificacion.destroy({
    where: {
      [Op.or]: [
        { fecha_expiracion: { [Op.lt]: ahora } },
        { leida: true, fecha_creacion: { [Op.lt]: hace(leidasDias) } },
        { fecha_creacion: { [Op.lt]: hace(noLeidasDias) } },
      ],
    } as any,
  });
};
