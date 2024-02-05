import { Request, Response } from "express";
import db from "../database/connection";

export const getFeligreses = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [feligres, metadata] =
      await db.query(`SELECT count(u.id), u.id, u.primerNombre, u.segundoNombre, u.primerApellido, 
                        u.segundoApellido, u.email, u.fechaNacimiento, u.numeroCelular, p.pais, sc.obrero_id, c.congregacion,  sc.obrero_id, u.estado FROM  
                        usuario u 
                        INNER JOIN usuarioCongregacion uc 
                        ON u.id = uc.usuario_id 
                        INNER JOIN pais p 
                        ON uc.pais_id = p.id
                        INNER JOIN congregacion c 
                        ON uc.congregacion_id = c.id                                         
                        INNER JOIN supervisorCongregacion sc 
                        ON sc.pais_id = p.id 
                        WHERE sc.obrero_id = ${id} AND u.estado = 1
                        ORDER BY u.primerNombre;`);

    res.json({
      ok: true,
      feligres,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
