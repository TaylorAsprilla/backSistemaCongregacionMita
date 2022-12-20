import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import generarJWT from "../helpers/tokenJwt";
import { CustomRequest } from "../middlewares/validar-jwt";
import { loginMultimedia } from "./accesoMultimedia.controllers";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
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
  let accesoMultimedia: boolean = false;

  buscarUsuario = usuarioID = await Usuario.findByPk(idUsuario);

  if (buscarUsuario) {
    usuario = await Usuario.build(body);
    token = await generarJWT(idUsuario, usuario.getDataValue("login"));
    usuarioID = await Usuario.findByPk(idUsuario, {
      include: [
        {
          all: true,
          required: false,
        },
      ],
    });
  } else {
    usuario = await AccesoMultimedia.build(body);
    token = await generarJWT(idUsuario, usuario.getDataValue("login"));
    const solicitud_id = await usuario.getDataValue("solicitud_id");
    usuarioID = await SolicitudMultimedia.findByPk(
      usuario.getDataValue("solicitud_id")
    );
    console.log(
      "Usuario ID",
      idUsuario,
      await SolicitudMultimedia.findByPk(idUsuario)
    );
    accesoMultimedia = true;
  }

  res.json({
    ok: true,
    token,
    usuario: usuarioID,
    accesoMultimedia,
  });
};
