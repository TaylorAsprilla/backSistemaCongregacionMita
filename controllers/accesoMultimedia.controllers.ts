import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import generarJWT from "../helpers/tokenJwt";
import { CustomRequest } from "../middlewares/validar-jwt";
import AccesoMultimedia from "../models/accesoMultimedia.model";
import Solicitud from "../models/solicitud.model";

export const loginMultimedia = async (req: Request, res: Response) => {
  const { login, password } = req.body;
  try {
    // Verificar Usuario
    const loginUsuarioCmarLive = await AccesoMultimedia.findOne({
      where: {
        login: login,
      },
    });

    if (!loginUsuarioCmarLive) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no válido",
      });
    }

    // Verificar contraseña

    const validarPassword = bcrypt.compareSync(
      password,
      loginUsuarioCmarLive.getDataValue("password")
    );

    if (!validarPassword) {
      return res.status(404).json({
        ok: false,
        msg: "Contraseña no válida",
      });
    }

    // Generar Token - JWT
    const token = await generarJWT(
      loginUsuarioCmarLive.getDataValue("id"),
      loginUsuarioCmarLive.getDataValue("login")
    );

    const datosUsuario = await Solicitud.findByPk(
      loginUsuarioCmarLive.getDataValue("solicitud_id")
    );
    console.log("Token", token);
    res.json({
      ok: true,
      token,
      loginUsuarioCmarLive,
      usuario: datosUsuario,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const renewToken = async (req: CustomRequest, res: Response) => {
  const idUsaurio = req.id;
  const { body } = req;

  const usuario = await Usuario.build(body);

  // Generar el TOKEN - JWT
  const token = await generarJWT(idUsaurio, usuario.getDataValue("login"));

  // Obtener el usuario por UID
  const usuarioID = await Usuario.findByPk(idUsaurio);

  res.json({
    ok: true,
    token,
    usuario: usuarioID,
  });
};
