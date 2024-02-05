import { Request, Response } from "express";
import db from "../database/connection";
import { QueryTypes } from "sequelize";

export const getUsuariosPorPais = async (req: Request, res: Response) => {
  try {
    const desde = Number(req.query.desde) || 0;
    const idPais = Number(req.query.idPais);

    if (!idPais || isNaN(idPais)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID de la congregación no es válido.",
      });
    }

    const [usuariosResult, totalUsuariosResult] = await Promise.all([
      db.query(
        `
        SELECT     
         distinct(u.id), u.primerNombre, u.segundoNombre, u.primerApellido, u.segundoApellido, 
          u.apodo, u.fechaNacimiento, u.email, u.numeroCelular, p.pais, co.congregacion, 
          ca.campo, u.estado 
        FROM  
          usuario u 
        INNER JOIN 
          usuarioCongregacion uc ON u.id = uc.usuario_id
        RIGHT JOIN 
          pais p ON p.id = uc.pais_id 
        RIGHT JOIN 
          congregacion co ON co.id = uc.congregacion_id 
        RIGHT JOIN 
          campo ca ON ca.id = uc.campo_id  
        WHERE 
          uc.pais_id = :idPais
        ORDER BY 
          u.id
        LIMIT 50
        OFFSET :desde;
      `,
        {
          replacements: { idPais, desde },
          type: QueryTypes.SELECT,
        }
      ),
      db.query(
        `
        SELECT COUNT(*) OVER() as total FROM usuario u 
        INNER JOIN usuarioCongregacion uc ON u.id = uc.usuario_id
        WHERE uc.pais_id = :idPais;
      `,
        {
          replacements: { idPais },
          type: QueryTypes.SELECT,
        }
      ),
    ]);

    const usuarios = usuariosResult || [];

    const totalUsuarios =
      (totalUsuariosResult[0] as { total?: number })?.total || 0;

    return res.json({
      ok: true,
      usuarios,
      totalUsuarios,
      msg: `Feligreses del pais`,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener usuarios, por favor contacta al administrador",
      error,
    });
  }
};

export const getUsuariosPorCongregacion = async (
  req: Request,
  res: Response
) => {
  try {
    const desde = Number(req.query.desde) || 0;
    const idCongregacion = Number(req.query.idCongregacion);

    // Validar si idCongregacion es un número válido
    if (!idCongregacion || isNaN(idCongregacion)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID de la congregación no es válido.",
      });
    }

    /// Consultar usuarios con paginación y asociación a UsuarioCongregacion
    const [usuariosResult, totalUsuariosResult] = await Promise.all([
      db.query(
        `
        SELECT     
         distinct(u.id), u.primerNombre, u.segundoNombre, u.primerApellido, u.segundoApellido, 
          u.apodo, u.fechaNacimiento, u.email, u.numeroCelular, p.pais, co.congregacion, 
          ca.campo, u.estado 
        FROM  
          usuario u 
        INNER JOIN 
          usuarioCongregacion uc ON u.id = uc.usuario_id
        RIGHT JOIN 
          pais p ON p.id = uc.pais_id 
        RIGHT JOIN 
          congregacion co ON co.id = uc.congregacion_id 
        RIGHT JOIN 
          campo ca ON ca.id = uc.campo_id  
        WHERE 
          uc.congregacion_id = :idCongregacion
        ORDER BY 
          u.id
        LIMIT 50
        OFFSET :desde;
      `,
        {
          replacements: { idCongregacion, desde },
          type: QueryTypes.SELECT,
        }
      ),
      db.query(
        `
        SELECT COUNT(*) OVER() as total FROM usuario u 
        INNER JOIN usuarioCongregacion uc ON u.id = uc.usuario_id
        WHERE uc.congregacion_id = :idCongregacion;
      `,
        {
          replacements: { idCongregacion },
          type: QueryTypes.SELECT,
        }
      ),
    ]);

    const usuarios = usuariosResult || [];

    const totalUsuarios =
      (totalUsuariosResult[0] as { total?: number })?.total || 0;

    return res.json({
      ok: true,
      usuarios,
      totalUsuarios,
      msg: `Usuarios de la congregación`,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener usuarios, por favor contacta al administrador",
      error,
    });
  }
};

export const getUsuariosPorCampo = async (req: Request, res: Response) => {
  try {
    const desde = Number(req.query.desde) || 0;
    const idCampo = Number(req.query.idCampo);

    if (!idCampo || isNaN(idCampo)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del campo no es válido.",
      });
    }

    const [usuariosResult, totalUsuariosResult] = await Promise.all([
      db.query(
        `
        SELECT     
         distinct(u.id), u.primerNombre, u.segundoNombre, u.primerApellido, u.segundoApellido, 
          u.apodo, u.fechaNacimiento, u.email, u.numeroCelular, p.pais, co.congregacion, 
          ca.campo, u.estado 
        FROM  
          usuario u 
        INNER JOIN 
          usuarioCongregacion uc ON u.id = uc.usuario_id
        RIGHT JOIN 
          pais p ON p.id = uc.pais_id 
        RIGHT JOIN 
          congregacion co ON co.id = uc.congregacion_id 
        RIGHT JOIN 
          campo ca ON ca.id = uc.campo_id  
        WHERE 
          uc.campo_id = :idCampo
        ORDER BY 
          u.id
        LIMIT 50
        OFFSET :desde;
      `,
        {
          replacements: { idCampo, desde },
          type: QueryTypes.SELECT,
        }
      ),
      db.query(
        `
        SELECT COUNT(*) OVER() as total FROM usuario u 
        INNER JOIN usuarioCongregacion uc ON u.id = uc.usuario_id
        WHERE uc.campo_id = :idCampo;
      `,
        {
          replacements: { idCampo },
          type: QueryTypes.SELECT,
        }
      ),
    ]);

    const usuarios = usuariosResult || [];

    const totalUsuarios =
      (totalUsuariosResult[0] as { total?: number })?.total || 0;

    return res.json({
      ok: true,
      usuarios,
      totalUsuarios,
      msg: `Feligreses del campo`,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener usuarios, por favor contacta al administrador",
      error,
    });
  }
};
