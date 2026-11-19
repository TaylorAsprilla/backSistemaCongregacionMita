import { Op, QueryTypes } from "sequelize";
import db from "../../database/connection";
import Campo from "../../models/campo.model";
import Congregacion from "../../models/congregacion.model";
import Pais from "../../models/pais.model";
import UsuarioCongregacion from "../../models/usuarioCongregacion.model";
import { ROLES_ID } from "../../enum/roles.enum";
import { DASHBOARD_SUPERVISION_CONFIG } from "../../config/dashboardSupervision.config";
import { obtenerContextoObreroPais } from "../supervisionPais.authorization";

/**
 * Resolución de destinatarios. Todas las reglas de "quién recibe qué" viven aquí, apoyadas en las
 * mismas fuentes de verdad que la autorización de informes (encargados de Pais / Congregacion / Campo
 * y permisos en `usuarioPermiso`), para que una notificación nunca llegue a quien no puede ver el dato.
 */

export const unicos = (...valores: unknown[]): number[] => [
  ...new Set(valores.flat().map(Number).filter((n) => Number.isInteger(n) && n > 0)),
];

const consultarIds = async (sql: string, replacements: Record<string, unknown>): Promise<number[]> =>
  unicos(
    (await db.query(sql, { type: QueryTypes.SELECT, replacements })).map((fila: any) => fila.id),
  );

/** Usuarios activos con alguno de los permisos indicados (opcionalmente acotados a unos candidatos). */
export const obtenerUsuariosConPermiso = async (permisos: string[], candidatos?: number[]): Promise<number[]> => {
  if (candidatos && !candidatos.length) return [];
  return consultarIds(
    `SELECT DISTINCT up.usuario_id AS id
       FROM usuarioPermiso up
       INNER JOIN usuario u ON u.id = up.usuario_id
      WHERE up.permiso_id IN (:permisos)
        AND u.estado = 'ACTIVO'
        ${candidatos ? "AND up.usuario_id IN (:candidatos)" : ""}`,
    { permisos, candidatos: candidatos ?? [] },
  );
};

/** Quienes pueden consultar el Dashboard de Supervisión (alertas administrativas). */
export const obtenerAdministradores = (): Promise<number[]> =>
  obtenerUsuariosConPermiso(DASHBOARD_SUPERVISION_CONFIG.rolesAutorizados);

/** Responsables vigentes de una Congregación Ciudad. */
export const obtenerResponsablesCongregacion = async (congregacionId: number) => {
  const congregacion = await Congregacion.findByPk(congregacionId, {
    attributes: ["id", "congregacion", "pais_id", "idObreroEncargado", "idObreroEncargadoDos", "estado"],
  });
  if (!congregacion) return null;
  return {
    nombre: congregacion.getDataValue("congregacion") as string,
    paisId: Number(congregacion.getDataValue("pais_id")),
    responsables: unicos(
      congregacion.getDataValue("idObreroEncargado"),
      congregacion.getDataValue("idObreroEncargadoDos"),
    ),
  };
};

/**
 * Obreros País que supervisan ese país: el encargado del país que además conserva el permiso de
 * Obrero País (misma regla que `obtenerContextoObreroPais`, usada al autorizar informes).
 */
export const obtenerObrerosPais = async (paisId: number): Promise<number[]> => {
  const pais = await Pais.findByPk(paisId, { attributes: ["id", "idObreroEncargado", "estado"] });
  const encargado = Number(pais?.getDataValue("idObreroEncargado"));
  if (!pais || !pais.getDataValue("estado") || !Number.isInteger(encargado) || encargado <= 0) return [];
  const contexto = await obtenerContextoObreroPais(encargado);
  return contexto?.paises.includes(paisId) ? [encargado] : [];
};

/**
 * Aprobadores de multimedia con responsabilidad sobre las unidades (país, congregación o campo)
 * de la persona que solicita acceso. Es la misma relación que usa el aviso semanal por correo.
 */
export const obtenerAprobadoresDeSolicitante = async (solicitanteId: number): Promise<number[]> => {
  const asignaciones = await UsuarioCongregacion.findAll({
    attributes: ["pais_id", "congregacion_id", "campo_id"],
    where: { usuario_id: solicitanteId },
  });
  const paisIds = unicos(asignaciones.map((a) => a.getDataValue("pais_id")));
  const congregacionIds = unicos(asignaciones.map((a) => a.getDataValue("congregacion_id")));
  const campoIds = unicos(asignaciones.map((a) => a.getDataValue("campo_id")));

  const [paises, congregaciones, campos] = await Promise.all([
    paisIds.length
      ? Pais.findAll({
          attributes: ["idObreroEncargado", "idAdministrador"],
          where: { id: { [Op.in]: paisIds }, estado: true },
        })
      : [],
    congregacionIds.length
      ? Congregacion.findAll({
          attributes: ["idObreroEncargado", "idObreroEncargadoDos"],
          where: { id: { [Op.in]: congregacionIds }, estado: true },
        })
      : [],
    campoIds.length
      ? Campo.findAll({
          attributes: ["idObreroEncargado", "idObreroEncargadoDos"],
          where: { id: { [Op.in]: campoIds }, estado: true },
        })
      : [],
  ]);

  const encargados = unicos(
    paises.map((p) => [p.getDataValue("idObreroEncargado"), p.getDataValue("idAdministrador")]),
    congregaciones.map((c) => [c.getDataValue("idObreroEncargado"), c.getDataValue("idObreroEncargadoDos")]),
    campos.map((c) => [c.getDataValue("idObreroEncargado"), c.getDataValue("idObreroEncargadoDos")]),
  );
  return obtenerUsuariosConPermiso([ROLES_ID.APROBADOR_MULTIMEDIA], encargados);
};
