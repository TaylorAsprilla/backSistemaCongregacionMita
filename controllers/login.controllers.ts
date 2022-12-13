import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import generarJWT from "../helpers/tokenJwt";
import { CustomRequest } from "../middlewares/validar-jwt";
import { loginMultimedia } from "./accesoMultimedia.controllers";
import Solicitud from "../models/solicitud.model";
import AccesoMultimedia from "../models/accesoMultimedia.model";

export const login = async (req: Request, res: Response) => {
  const { login, password } = req.body;

  try {
    // Verificar Usuario

    const loginUsuario = await Usuario.findOne({
      where: {
        login: login,
      },
    });

    if (!loginUsuario) {
      //TODO Login para la solicitudes de acceso Multimedia
      const loginMultimediaS = loginMultimedia(req, res);
      if (!loginMultimediaS) {
        return res.status(404).json({
          ok: false,
          msg: "Usuario no válido",
        });
      }
    }

    // Verificar contraseña
    if (loginUsuario) {
      const validarPassword = bcrypt.compareSync(
        password,
        loginUsuario.getDataValue("password")
      );

      if (!validarPassword) {
        return res.status(404).json({
          ok: false,
          msg: "Contraseña no válida",
        });
      }

      if (loginUsuario && validarPassword) {
        // Generar Token - JWT
        const token = await generarJWT(
          loginUsuario.getDataValue("id"),
          loginUsuario.getDataValue("login")
        );
        res.json({
          ok: true,
          token: token,
          usuario: loginUsuario,
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const renewToken = async (req: CustomRequest, res: Response) => {
  const idUsuario = req.id;
  const { body } = req;
  let usuario;
  let usuarioID;
  let token;
  let buscarUsuario;

  console.log("IIIIIDDDDDD", idUsuario);

  buscarUsuario = usuarioID = await Usuario.findByPk(idUsuario);

  if (buscarUsuario) {
    console.log("buscarUsuario", buscarUsuario);
    usuario = Usuario.build(body);
    console.log("Usuario...............", usuario);
    token = await generarJWT(idUsuario, usuario.getDataValue("login"));
    usuarioID = await Usuario.findByPk(idUsuario);
    console.log("Login.........");
  } else {
    usuario = AccesoMultimedia.build(body);
    token = await generarJWT(idUsuario, usuario.getDataValue("login"));
    usuarioID = await AccesoMultimedia.findByPk(idUsuario);
    console.log("Usuario Solicitudd.........");
  }

  // usuario = Solicitud.build(body);

  // Generar el TOKEN - JWT

  // token = await generarJWT(idUsuario, usuario.getDataValue("login"));

  // Obtener el usuario por UID

  // usuarioID = await Solicitud.findByPk(idUsuario);

  res.json({
    ok: true,
    token,
    usuario: usuarioID,
  });
};
