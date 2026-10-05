import { QueryTypes } from "sequelize";
import db from "../../database/connection";

/**
 * Capa de acceso a datos del dashboard. Todas las consultas son agregadas (GROUP BY)
 * y parametrizadas con `replacements` para evitar inyección SQL.
 */

/** Periodo efectivo del informe: `periodo` o, en informes antiguos sin periodo, el trimestre de `createdAt`. */
export const SQL_PERIODO_INFORME =
  "COALESCE(i.periodo, DATE_ADD(MAKEDATE(YEAR(i.createdAt), 1), INTERVAL (QUARTER(i.createdAt) - 1) * 3 MONTH))";

const seleccionar = async <T>(sql: string, replacements: Record<string, unknown> = {}) =>
  db.query(sql, { replacements, type: QueryTypes.SELECT }) as Promise<T[]>;

const numero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const numeroONulo = (valor: unknown): number | null =>
  valor === null || valor === undefined ? null : numero(valor);

export interface FilaPais {
  id: number;
  nombre: string;
}

export interface FilaPaisCatalogo extends FilaPais {
  obreros: number[];
}

export interface FilaCongregacion {
  id: number;
  nombre: string;
  pais_id: number | null;
  obreros: number[];
}

export interface FilaCampo {
  id: number;
  nombre: string;
  congregacion_id: number | null;
  obreros: number[];
}

const obreros = (...ids: unknown[]) =>
  [...new Set(ids.map(numeroONulo).filter((id): id is number => !!id && id > 0))];

export const obtenerPaises = async (): Promise<FilaPaisCatalogo[]> =>
  (
    await seleccionar<any>(
      "SELECT id, pais, idObreroEncargado FROM pais WHERE COALESCE(estado, 1) = 1 ORDER BY pais",
    )
  ).map((f) => ({ id: numero(f.id), nombre: f.pais, obreros: obreros(f.idObreroEncargado) }));

export const obtenerCongregaciones = async (): Promise<FilaCongregacion[]> =>
  (
    await seleccionar<any>(
      `SELECT id, congregacion, pais_id, idObreroEncargado, idObreroEncargadoDos
         FROM congregacion
        WHERE COALESCE(estado, 1) = 1
        ORDER BY congregacion`,
    )
  ).map((f) => ({
    id: numero(f.id),
    nombre: f.congregacion,
    pais_id: numeroONulo(f.pais_id),
    obreros: obreros(f.idObreroEncargado, f.idObreroEncargadoDos),
  }));

export const obtenerCampos = async (): Promise<FilaCampo[]> =>
  (
    await seleccionar<any>(
      `SELECT id, campo, congregacion_id, idObreroEncargado, idObreroEncargadoDos
         FROM campo
        WHERE COALESCE(estado, 1) = 1
        ORDER BY campo`,
    )
  ).map((f) => ({
    id: numero(f.id),
    nombre: f.campo,
    congregacion_id: numeroONulo(f.congregacion_id),
    obreros: obreros(f.idObreroEncargado, f.idObreroEncargadoDos),
  }));

export interface FilaUsuario {
  id: number;
  nombre: string;
  email: string | null;
}

export const obtenerUsuarios = async (ids: number[]): Promise<FilaUsuario[]> => {
  if (!ids.length) return [];
  return (
    await seleccionar<any>(
      `SELECT id, primerNombre, segundoNombre, primerApellido, segundoApellido, email
         FROM usuario WHERE id IN (:ids)`,
      { ids },
    )
  ).map((f) => ({
    id: numero(f.id),
    nombre: [f.primerNombre, f.segundoNombre, f.primerApellido, f.segundoApellido]
      .filter((parte: string | null) => parte && String(parte).trim())
      .join(" "),
    email: f.email ?? null,
  }));
};

export interface FilaInforme {
  id: number;
  usuario_id: number;
  estado: string;
  /** YYYY-MM-DD (primer día del trimestre). */
  periodo: string;
  createdAt: string | null;
}

/** Informes no eliminados de los usuarios indicados cuyo periodo está en [inicio, fin). */
export const obtenerInformes = async (
  usuarios: number[],
  inicio: string,
  finExclusivo: string,
): Promise<FilaInforme[]> => {
  if (!usuarios.length) return [];
  return (
    await seleccionar<any>(
      `SELECT i.id, i.usuario_id, i.estado,
              DATE_FORMAT(${SQL_PERIODO_INFORME}, '%Y-%m-%d') AS periodo,
              DATE_FORMAT(i.createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt
         FROM informe i
        WHERE i.usuario_id IN (:usuarios)
          AND i.estado <> 'Eliminado'
          AND ${SQL_PERIODO_INFORME} >= :inicio
          AND ${SQL_PERIODO_INFORME} < :fin`,
      { usuarios, inicio, fin: finExclusivo },
    )
  ).map((f) => ({
    id: numero(f.id),
    usuario_id: numero(f.usuario_id),
    estado: f.estado,
    periodo: f.periodo,
    createdAt: f.createdAt ?? null,
  }));
};

export interface FilaActividad {
  informe_id: number;
  nombre: string | null;
  diaSemana: number | null;
  cantidad: number;
  asistencia: number;
}

export const obtenerActividades = async (informes: number[]): Promise<FilaActividad[]> => {
  if (!informes.length) return [];
  return (
    await seleccionar<any>(
      `SELECT a.informe_id, t.nombre, DAYOFWEEK(a.fecha) AS diaSemana,
              COUNT(*) AS cantidad, SUM(COALESCE(a.asistencia, 0)) AS asistencia
         FROM actividad a
         LEFT JOIN tipoActividadEclesiastico t ON t.id = a.tipoActividad_id
        WHERE a.informe_id IN (:informes)
        GROUP BY a.informe_id, t.nombre, DAYOFWEEK(a.fecha)`,
      { informes },
    )
  ).map((f) => ({
    informe_id: numero(f.informe_id),
    nombre: f.nombre ?? null,
    diaSemana: numeroONulo(f.diaSemana),
    cantidad: numero(f.cantidad),
    asistencia: numero(f.asistencia),
  }));
};

export interface FilaVisita {
  informe_id: number;
  registros: number;
  hogares: number;
  hospital: number;
  remotas: number;
  referidas: number;
}

export const obtenerVisitas = async (informes: number[]): Promise<FilaVisita[]> => {
  if (!informes.length) return [];
  return (
    await seleccionar<any>(
      `SELECT informe_id, COUNT(*) AS registros,
              SUM(COALESCE(visitasHogares, 0)) AS hogares,
              SUM(COALESCE(visitaHospital, 0)) AS hospital,
              SUM(COALESCE(visitaRemota, 0)) AS remotas,
              SUM(COALESCE(referidasOots, 0)) AS referidas
         FROM visita
        WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        GROUP BY informe_id`,
      { informes },
    )
  ).map((f) => ({
    informe_id: numero(f.informe_id),
    registros: numero(f.registros),
    hogares: numero(f.hogares),
    hospital: numero(f.hospital),
    remotas: numero(f.remotas),
    referidas: numero(f.referidas),
  }));
};

export interface FilaConteo {
  informe_id: number;
  clave: string;
  cantidad: number;
  suma1: number;
  suma2: number;
}

/**
 * Conteos por informe de las secciones de tipo "lista de eventos".
 * `clave` identifica la métrica destino (ver `metricas.ts`).
 */
export const obtenerConteos = async (informes: number[]): Promise<FilaConteo[]> => {
  if (!informes.length) return [];
  return (
    await seleccionar<any>(
      `SELECT informe_id, 'sit' AS clave, COUNT(*) AS cantidad,
              SUM(CASE WHEN TRIM(COALESCE(seguimiento, '')) <> '' THEN 1 ELSE 0 END) AS suma1,
              0 AS suma2
         FROM situacionVisita WHERE informe_id IN (:informes)
        GROUP BY informe_id
       UNION ALL
       SELECT informe_id, CONCAT('esp.cat.', COALESCE(categoria_id, 0)), COUNT(*), 0, 0
         FROM actividadEspiritual
        WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        GROUP BY informe_id, categoria_id
       UNION ALL
       SELECT informe_id, 'eco', COUNT(*),
              SUM(COALESCE(asistencia, 0)), SUM(COALESCE(cantidadRecaudada, 0))
         FROM actividadEconomica WHERE informe_id IN (:informes)
        GROUP BY informe_id
       UNION ALL
       SELECT informe_id, 'logros', COUNT(*), 0, 0
         FROM logro WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        GROUP BY informe_id
       UNION ALL
       SELECT informe_id, 'metas', COUNT(*), 0, 0
         FROM meta WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        GROUP BY informe_id
       UNION ALL
       SELECT informe_id, CONCAT('asuntos.', COALESCE(tipoAsunto, 'SIN_TIPO')), COUNT(*), 0, 0
         FROM asuntoPendiente WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        GROUP BY informe_id, tipoAsunto`,
      { informes },
    )
  ).map((f) => ({
    informe_id: numero(f.informe_id),
    clave: String(f.clave),
    cantidad: numero(f.cantidad),
    suma1: numero(f.suma1),
    suma2: numero(f.suma2),
  }));
};

export interface FilaAsunto {
  informe_id: number;
  asunto: string;
  tipoAsunto: string | null;
  responsable: string | null;
}

export const obtenerAsuntos = async (informes: number[]): Promise<FilaAsunto[]> => {
  if (!informes.length) return [];
  return (
    await seleccionar<any>(
      `SELECT informe_id, asunto, tipoAsunto, responsable
         FROM asuntoPendiente
        WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        ORDER BY id`,
      { informes },
    )
  ).map((f) => ({
    informe_id: numero(f.informe_id),
    asunto: f.asunto ?? "",
    tipoAsunto: f.tipoAsunto ?? null,
    responsable: f.responsable ?? null,
  }));
};

export const obtenerLogros = async (informes: number[]) => {
  if (!informes.length) return [];
  return (
    await seleccionar<any>(
      `SELECT logro, responsable, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha
         FROM logro
        WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        ORDER BY fecha, id`,
      { informes },
    )
  ).map((f) => ({
    logro: f.logro ?? "",
    responsable: f.responsable ?? null,
    fecha: f.fecha ?? null,
  }));
};

export const obtenerMetas = async (informes: number[]) => {
  if (!informes.length) return [];
  return (
    await seleccionar<any>(
      `SELECT meta, accion, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
              DATE_FORMAT(fechaCumplimiento, '%Y-%m-%d') AS fechaCumplimiento
         FROM meta
        WHERE informe_id IN (:informes) AND COALESCE(estado, 1) = 1
        ORDER BY fecha, id`,
      { informes },
    )
  ).map((f) => ({
    meta: f.meta ?? "",
    accion: f.accion ?? null,
    fecha: f.fecha ?? null,
    fechaCumplimiento: f.fechaCumplimiento ?? null,
  }));
};

export const obtenerCategoriasEspirituales = async (): Promise<FilaPais[]> =>
  (
    await seleccionar<any>("SELECT id, nombre FROM categoriaActividadEspiritual ORDER BY id")
  ).map((f) => ({ id: numero(f.id), nombre: f.nombre }));

/** Ids de permiso (tabla `permiso`) asignados al usuario. */
export const obtenerPermisosUsuario = async (usuarioId: number): Promise<string[]> =>
  (
    await seleccionar<any>(
      "SELECT permiso_id FROM usuarioPermiso WHERE usuario_id = :usuarioId",
      { usuarioId },
    )
  ).map((f) => String(f.permiso_id));
