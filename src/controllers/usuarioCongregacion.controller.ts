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
    const idUsuario = Number(req.query.idUsuario);

    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del usuario no es válido.",
      });
    }

    // Buscar todos los países donde el obrero es encargado
    const paises = await Pais.findAll({
      where: { idObreroEncargado: idUsuario },
      attributes: ["id"],
    });

    const paisIds = paises.map((p) => p.getDataValue("id"));

    // Si el obrero no tiene países asignados, retornar vacío
    if (paisIds.length === 0) {
      return res.json({
        ok: true,
        usuarios: [],
        totalUsuarios: 0,
        msg: `El obrero no tiene países asignados`,
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
        msg: `No se encontraron usuarios en los países asignados`,
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
      msg: `Feligreses de los países asignados`,
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
  res: Response,
) => {
  try {
    const idUsuario = Number(req.query.idUsuario);

    // Validar si idUsuario es un número válido
    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID de usuario no es válido.",
      });
    }

    // Buscar todos los países, congregaciones y campos del obrero encargado y/o obrero auxiliar con el ID proporcionado
    const [paises, congregaciones, campos] = await Promise.all([
      Pais.findAll({
        where: {
          idObreroEncargado: idUsuario,
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

    // Verificar si el obrero encargado tiene asignado algún país, congregación o campo
    if (
      paises.length === 0 &&
      congregaciones.length === 0 &&
      campos.length === 0
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "El obrero no tiene asignado ningún país, congregación o campo.",
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
        msg: `No se encontraron usuarios en los países, congregaciones y campos asignados`,
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
          model: Usuario,
          as: "usuarioQueRegistra",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
            "email",
            "numeroCelular",
          ],
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
      msg: `Usuarios de países, congregaciones y campos asignados`,
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
