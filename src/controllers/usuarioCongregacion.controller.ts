import { Request, Response } from "express";
import db from "../database/connection";
import { Op, QueryTypes } from "sequelize";
import Congregacion from "../models/congregacion.model";
import Usuario from "../models/usuario.model";
import Pais from "../models/pais.model";
import Campo from "../models/campo.model";
import EstadoCivil from "../models/estadoCivil.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";

export const getUsuariosPorPais = async (req: Request, res: Response) => {
  try {
    const idUsuario = req.query.idUsuario ? Number(req.query.idUsuario) : null;

    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        msg: "Debe proporcionar un idUsuario válido.",
      });
    }

    // Buscar países donde el usuario es Obrero Encargado o Administrador de País
    const paises = await Pais.findAll({
      where: {
        [Op.or]: [
          { idObreroEncargado: idUsuario },
          { idAdministrador: idUsuario },
        ],
      },
      attributes: ["id"],
    });

    const paisIds = paises.map((p) => p.getDataValue("id"));

    if (paisIds.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: `El usuario con id ${idUsuario} no tiene ningún país asignado como Obrero Encargado ni como Administrador de País.`,
      });
    }

    // Primero obtener los IDs de usuarios desde UsuarioCongregacion
    const usuariosCongregacion = await UsuarioCongregacion.findAll({
      where: {
        pais_id: { [Op.in]: paisIds },
      },
      attributes: ["usuario_id"],
    });

    const usuarioIds = [
      ...new Set(
        usuariosCongregacion.map((uc) => uc.getDataValue("usuario_id")),
      ),
    ];

    if (usuarioIds.length === 0) {
      return res.json({
        ok: true,
        usuarios: [],
        totalUsuarios: 0,
        msg: `No se encontraron feligreses activos en los países asignados al usuario con id ${idUsuario}.`,
      });
    }

    // Obtener todos los usuarios con sus relaciones
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
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "codigoPostalDireccion",
        "paisDireccion",
        "esJoven",
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
        {
          model: EstadoCivil,
          as: "estadoCivil",
          attributes: ["estadoCivil"],
        },
      ],
      where: {
        id: { [Op.in]: usuarioIds },
        estado: ESTADO_USUARIO_ENUM.ACTIVO,
      },
      order: [["id", "ASC"]],
    });

    return res.json({
      ok: true,
      usuarios: rows,
      totalUsuarios: count,
      msg: `Se encontraron ${count} feligreses activos en los países asignados al usuario con id ${idUsuario}.`,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      ok: false,
      msg: "Ocurrió un error al obtener los feligreses. Por favor, contacta al administrador.",
      error,
    });
  }
};

export const getUsuariosPorCongregacion = async (
  req: Request,
  res: Response,
) => {
  try {
    const idUsuario = req.query.idUsuario ? Number(req.query.idUsuario) : null;

    // Validar si se proporcionó un ID válido
    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        msg: "Debe proporcionar un idUsuario válido.",
      });
    }

    // Buscar países (Obrero Encargado o Administrador de País), congregaciones y campos en paralelo
    const [paises, congregaciones, campos] = await Promise.all([
      Pais.findAll({
        where: {
          [Op.or]: [
            { idObreroEncargado: idUsuario },
            { idAdministrador: idUsuario },
          ],
        },
        attributes: ["id"],
      }),
      Congregacion.findAll({
        where: {
          [Op.or]: [
            { idObreroEncargado: idUsuario },
            { idObreroEncargadoDos: idUsuario },
          ],
        },
        attributes: ["id"],
      }),
      Campo.findAll({
        where: {
          [Op.or]: [
            { idObreroEncargado: idUsuario },
            { idObreroEncargadoDos: idUsuario },
          ],
        },
        attributes: ["id"],
      }),
    ]);

    // Verificar si el usuario tiene asignado algún país, congregación o campo
    if (
      paises.length === 0 &&
      congregaciones.length === 0 &&
      campos.length === 0
    ) {
      return res.status(404).json({
        ok: false,
        msg: `El usuario con id ${idUsuario} no tiene ningún país, congregación ni campo asignado como Obrero Encargado, Obrero Auxiliar o Administrador de País.`,
      });
    }

    // Obtener los IDs de países, congregaciones y campos
    const paisIds = paises.map((pais) => pais.getDataValue("id"));
    const congregacionIds = congregaciones.map((congregacion) =>
      congregacion.getDataValue("id"),
    );
    const campoIds = campos.map((campo) => campo.getDataValue("id"));

    // Primero obtener los IDs de usuarios desde UsuarioCongregacion
    const usuariosCongregacion = await UsuarioCongregacion.findAll({
      where: {
        [Op.or]: [
          ...(paisIds.length > 0 ? [{ pais_id: { [Op.in]: paisIds } }] : []),
          ...(congregacionIds.length > 0
            ? [{ congregacion_id: { [Op.in]: congregacionIds } }]
            : []),
          ...(campoIds.length > 0 ? [{ campo_id: { [Op.in]: campoIds } }] : []),
        ],
      },
      attributes: ["usuario_id"],
    });

    const usuarioIds = [
      ...new Set(
        usuariosCongregacion.map((uc) => uc.getDataValue("usuario_id")),
      ),
    ];

    if (usuarioIds.length === 0) {
      return res.json({
        ok: true,
        usuarios: [],
        totalUsuarios: 0,
        msg: `No se encontraron feligreses activos en los países, congregaciones y campos asignados al usuario con id ${idUsuario}.`,
      });
    }

    // Obtener todos los usuarios con sus relaciones
    const { count, rows } = await Usuario.findAndCountAll({
      distinct: true,
      col: "id",
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
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "codigoPostalDireccion",
        "paisDireccion",
        "esJoven",
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
        {
          model: EstadoCivil,
          as: "estadoCivil",
          attributes: ["estadoCivil"],
        },
      ],
      where: {
        id: { [Op.in]: usuarioIds },
        estado: ESTADO_USUARIO_ENUM.ACTIVO,
      },
      order: [["id", "ASC"]],
    });

    return res.json({
      ok: true,
      usuarios: rows,
      totalUsuarios: count,
      msg: `Se encontraron ${count} feligreses activos en los países, congregaciones y campos asignados al usuario con id ${idUsuario}.`,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({
      ok: false,
      msg: "Ocurrió un error al obtener los feligreses. Por favor, contacta al administrador.",
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
          ca.campo, u.esJoven, u.estado 
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
        },
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
        },
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
