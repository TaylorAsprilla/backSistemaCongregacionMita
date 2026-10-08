import { Model, Op } from "sequelize";
import { ROLES_ID } from "../enum/roles.enum";
import Campo from "../models/campo.model";
import Congregacion from "../models/congregacion.model";
import Pais from "../models/pais.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import {
  obtenerNombresPermisosUsuario,
  obtenerPermisosUsuario,
} from "./dashboardSupervision/consultas";
import { tienePermisoObreroPais } from "./supervisionPais.scope";

export interface ContextoObreroPais {
  paises: number[];
}

export const obtenerContextoObreroPais = async (
  usuarioId: number,
): Promise<ContextoObreroPais | null> => {
  const [permisos, nombresPermisos] = await Promise.all([
    obtenerPermisosUsuario(usuarioId),
    obtenerNombresPermisosUsuario(usuarioId),
  ]);
  if (!tienePermisoObreroPais(permisos, nombresPermisos, ROLES_ID.OBRERO_PAIS)) return null;

  const paises = await Pais.findAll({
    attributes: ["id"],
    where: { idObreroEncargado: usuarioId, estado: true },
  });

  return {
    paises: paises
      .map((pais) => Number(pais.getDataValue("id")))
      .filter((id) => Number.isInteger(id) && id > 0),
  };
};

const obtenerUnidadesActivasDelPais = async (paisIds: number[]) => {
  if (!paisIds.length) return { congregaciones: [], campos: [] };
  const congregaciones = await Congregacion.findAll({
    attributes: ["id", "idObreroEncargado", "idObreroEncargadoDos"],
    where: { pais_id: { [Op.in]: paisIds }, estado: true },
  });
  const congregacionIds = congregaciones.map((congregacion) =>
    Number(congregacion.getDataValue("id")),
  );
  const campos = congregacionIds.length
    ? await Campo.findAll({
        attributes: ["id", "idObreroEncargado", "idObreroEncargadoDos"],
        where: { congregacion_id: { [Op.in]: congregacionIds }, estado: true },
      })
    : [];
  return { congregaciones, campos };
};

const extraerResponsables = (unidades: Model[]): number[] =>
  unidades
    .flatMap((unidad) => [
      Number(unidad.getDataValue("idObreroEncargado")),
      Number(unidad.getDataValue("idObreroEncargadoDos")),
    ])
    .filter((id) => Number.isInteger(id) && id > 0);

export const obtenerObrerosResponsablesPais = async (paisIds: number[]): Promise<number[]> => {
  const { congregaciones, campos } = await obtenerUnidadesActivasDelPais(paisIds);
  return [...new Set([
    ...extraerResponsables(congregaciones),
    ...extraerResponsables(campos),
  ])];
};

export const obtenerObrerosAsignadosAlPais = async (paisIds: number[]): Promise<number[]> => {
  if (!paisIds.length) return [];

  const { congregaciones, campos } = await obtenerUnidadesActivasDelPais(paisIds);
  const asignaciones = await UsuarioCongregacion.findAll({
    attributes: ["usuario_id"],
    where: {
      [Op.or]: [
        { pais_id: { [Op.in]: paisIds } },
        ...(congregaciones.length
          ? [{
              congregacion_id: {
                [Op.in]: congregaciones.map((congregacion) =>
                  Number(congregacion.getDataValue("id")),
                ),
              },
            }]
          : []),
        ...(campos.length
          ? [{ campo_id: { [Op.in]: campos.map((campo) => Number(campo.getDataValue("id"))) } }]
          : []),
      ],
    },
  });

  return [
    ...new Set([
      ...extraerResponsables([...congregaciones, ...campos]),
      ...asignaciones
        .map((asignacion) => Number(asignacion.getDataValue("usuario_id")))
        .filter((id) => Number.isInteger(id) && id > 0),
    ]),
  ];
};
