import { NextFunction, Response } from "express";
import type { CustomRequest } from "./validar-jwt";

export type BuscarPermisos = (usuarioId: number) => Promise<string[]>;

/**
 * Crea un middleware que exige que el usuario autenticado (`req.id`, asignado por
 * `validarJWT`) tenga al menos uno de los permisos indicados (ids de la tabla `permiso`).
 *
 * La consulta de permisos se inyecta para poder probar el middleware sin base de datos.
 */
export const crearValidadorRoles =
  (rolesPermitidos: string[], buscarPermisos: BuscarPermisos) =>
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.id) {
      return res.status(401).json({ ok: false, msg: "Usuario no autenticado." });
    }

    try {
      const permisos = await buscarPermisos(Number(req.id));
      const autorizado = permisos.some((permiso) => rolesPermitidos.includes(String(permiso)));
      if (!autorizado) {
        return res.status(403).json({
          ok: false,
          msg: "No tiene permisos para acceder a este recurso.",
        });
      }
      return next();
    } catch (error) {
      console.error("[AUTH] Error validando roles:", error);
      return res.status(500).json({ ok: false, msg: "No fue posible validar los permisos." });
    }
  };
