import { Op } from "sequelize";
import { ROLES_ID } from "../enum/roles.enum";
import Campo from "../models/campo.model";
import Congregacion from "../models/congregacion.model";
import {
  obtenerNombresPermisosUsuario,
  obtenerPermisosUsuario,
} from "./dashboardSupervision/consultas";

export type TipoUnidadObrero = "CONGREGACION" | "CAMPO";

export interface UnidadObreroAsignada {
  tipo: TipoUnidadObrero;
  id: number;
}

export interface ContextoObrero {
  unidades: UnidadObreroAsignada[];
}

const normalizarPermiso = (permiso: string): string =>
  permiso
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

export const obtenerContextoObrero = async (
  usuarioId: number,
): Promise<ContextoObrero | null> => {
  const [permisos, nombres] = await Promise.all([
    obtenerPermisosUsuario(usuarioId),
    obtenerNombresPermisosUsuario(usuarioId),
  ]);
  const tienePermiso = (id: string, nombre: string) =>
    permisos.includes(id) || nombres.some((permiso) => normalizarPermiso(permiso) === nombre);
  const unidades: UnidadObreroAsignada[] = [];

  if (tienePermiso(ROLES_ID.OBRERO_CIUDAD, "OBRERO CIUDAD")) {
    const congregaciones = await Congregacion.findAll({
      attributes: ["id"],
      where: {
        estado: true,
        [Op.or]: [{ idObreroEncargado: usuarioId }, { idObreroEncargadoDos: usuarioId }],
      },
    });
    unidades.push(
      ...congregaciones.map((unidad) => ({
        tipo: "CONGREGACION" as const,
        id: Number(unidad.getDataValue("id")),
      })),
    );
  }

  if (tienePermiso(ROLES_ID.OBRERO_CAMPO, "OBRERO CAMPO")) {
    const campos = await Campo.findAll({
      attributes: ["id"],
      where: {
        estado: true,
        [Op.or]: [{ idObreroEncargado: usuarioId }, { idObreroEncargadoDos: usuarioId }],
      },
    });
    unidades.push(
      ...campos.map((unidad) => ({
        tipo: "CAMPO" as const,
        id: Number(unidad.getDataValue("id")),
      })),
    );
  }

  return unidades.length ? { unidades } : null;
};
