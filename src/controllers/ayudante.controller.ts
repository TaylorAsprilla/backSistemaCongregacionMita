import { Request, Response } from "express";
import Usuario from "../models/usuario.model";
import Pais from "../models/pais.model";
import Congregacion from "../models/congregacion.model";
import Campo from "../models/campo.model";

// Path /ayudante?idUsuario

export const getUsuariosRegistradosPorElUsuario = async (
  req: Request,
  res: Response
) => {
  try {
    const idUsuario = Number(req.query.idUsuario);

    // Validar si idusuario es un número válido
    if (!idUsuario || isNaN(idUsuario)) {
      return res.status(400).json({
        ok: false,
        msg: "El número Mita no es válido.",
      });
    }

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
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "codigoPostalDireccion",
        "paisDireccion",
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
        idUsuarioQueRegistra: idUsuario,
      },
    });

    return res.json({
      ok: true,
      usuarios: rows,
      totalUsuarios: count,
      msg: `Usuarios registrados`,
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
