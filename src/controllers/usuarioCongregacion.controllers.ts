import { Request, Response } from "express";
import db from "../database/connection";
import { Op, QueryTypes } from "sequelize";
import Congregacion from "../models/congregacion.model";
import Usuario from "../models/usuario.model";
import Pais from "../models/pais.model";
import Campo from "../models/campo.model";

export const getUsuariosPorPais = async (req: Request, res: Response) => {
  try {
    const idUsuario = Number(req.query.idUsuario);

    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del usuario no es válido.",
      });
    }

    const pais = await Pais.findOne({
      where: { idObreroEncargado: idUsuario },
    });

    const paisId = pais ? pais.getDataValue("id") : null;

    // Obtener todos los usuarios asociados a esta congregación
    const { count, rows } = await Usuario.findAndCountAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "apodo",
        "fechaNacimiento",
        "email",
        "numeroCelular",
        "estado",
      ],
      include: [
        {
          model: Pais,
          as: "usuarioCongregacionPais",
          attributes: ["pais"],
          through: { attributes: [] },
        },
        {
          model: Congregacion,
          as: "usuarioCongregacionCongregacion",
          attributes: ["congregacion"],
          through: { attributes: [] },
        },
        {
          model: Campo,
          as: "usuarioCongregacionCampo",
          attributes: ["campo"],
          through: { attributes: [] },
        },
      ],
      where: {
        [Op.or]: [{ "$usuarioCongregacionPais.id$": paisId }],
      },
    });

    return res.json({
      ok: true,
      usuarios: rows,
      totalUsuarios: count,
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
    const idUsuario = Number(req.query.idUsuario);

    // Validar si idusuario es un número válido
    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID de usuario no es válido.",
      });
    }

    // Buscar la congregación del obrero encargado y/o obrero auxiliar con el ID proporcionado
    const [pais, congregacion, campo] = await Promise.all([
      Pais.findOne({
        where: {
          idObreroEncargado: idUsuario,
        },
      }),
      Congregacion.findOne({
        where: {
          [Op.or]: [
            { idObreroEncargado: idUsuario },
            { idObreroEncargadoDos: idUsuario },
          ],
        },
      }),
      Campo.findOne({
        where: {
          [Op.or]: [
            { idObreroEncargado: idUsuario },
            { idObreroEncargadoDos: idUsuario },
          ],
        },
      }),
    ]);

    // Verificar si el obrero encargado tiene asignada una congregación o campo
    if (!pais && !congregacion && !campo) {
      return res.status(404).json({
        message: "El obrero no tiene asignada una congregación o campo.",
      });
    }

    // Obtener el ID del país de la congregación y el ID del campo
    const paisId = pais ? pais.getDataValue("id") : null;
    const congregacionId = congregacion
      ? congregacion.getDataValue("id")
      : null;
    const campoId = campo ? campo.getDataValue("id") : null;

    // Obtener todos los usuarios asociados a esta congregación
    const { count, rows } = await Usuario.findAndCountAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "apodo",
        "fechaNacimiento",
        "email",
        "numeroCelular",
        "estado",
      ],
      include: [
        {
          model: Pais,
          as: "usuarioCongregacionPais",
          attributes: ["pais"],
          through: { attributes: [] },
        },
        {
          model: Congregacion,
          as: "usuarioCongregacionCongregacion",
          attributes: ["congregacion"],
          through: { attributes: [] },
        },
        {
          model: Campo,
          as: "usuarioCongregacionCampo",
          attributes: ["campo"],
          through: { attributes: [] },
        },
      ],
      where: {
        [Op.or]: [
          { "$usuarioCongregacionPais.id$": paisId },
          { "$usuarioCongregacionCongregacion.id$": congregacionId },
          { "$usuarioCongregacionCampo.id$": campoId },
        ],
      },
    });

    return res.json({
      ok: true,
      usuarios: rows,
      totalUsuarios: count,
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
      `,
        {
          replacements: { idCampo },
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
