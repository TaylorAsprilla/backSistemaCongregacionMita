import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model";
import generarJWT from "../helpers/tokenJwt";

export const getUsuarios = async (req: Request, res: Response) => {
  const usuarios = await Usuario.findAll();

  res.json({
    usuarios,
    msg: "getUsuarios",
  });
};

export const getUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;

  const usuario = await Usuario.findByPk(id);

  if (usuario) {
    res.json({
      usuario,
      msg: "getUsuarios",
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe el usuario con el id ${id}`,
    });
  }
};

export const crearUsuario = async (req: Request, res: Response) => {
  const { body } = req;
  const { email, password, numeroDocumento, numeroCelular, login } = req.body;

  // =======================================================================
  //                          Validaciones
  // =======================================================================
  try {
    const existeEmail = await Usuario.findOne({
      where: {
        email: email,
      },
    });

    if (existeEmail) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe un usuario con el email ${email}`,
      });
    }

    if (numeroDocumento) {
      const existeDocumento = await Usuario.findOne({
        where: {
          numeroDocumento: numeroDocumento,
        },
      });

      if (existeDocumento) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con el número de documento ${numeroDocumento}`,
        });
      }
    }

    const existeNumeroCelular = await Usuario.findOne({
      where: {
        numeroCelular: numeroCelular,
      },
    });

    if (existeNumeroCelular) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe un usuario con el número de celular ${numeroCelular}`,
      });
    }

    const existeLogin = await Usuario.findOne({
      where: {
        login: login,
      },
    });

    if (existeLogin) {
      return res.status(400).json({
        ok: false,
        msg: `Ya existe un usuario con el login ${login}`,
      });
    }

    // =======================================================================
    //                          Guardar Usuario
    // =======================================================================

    // Encriptar contraseña
    if (password) {
      const salt = bcrypt.genSaltSync();
      body.password = bcrypt.hashSync(password, salt);
    }

    const usuario = Usuario.build(body);
    await usuario.save();

    // Generar Token - JWT
    const token = await generarJWT(usuario.getDataValue("id"));

    res.json({ ok: true, msg: "Usuario creado ", token, usuario });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarUsuario = async (req: Request, res: Response) => {
  //TODO Validar token y validar si es el usuario correcto
  const { id } = req.params;
  const { body } = req;
  const { password, email, numeroDocumento, login, numeroCelular, ...campos } =
    body;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un usuario con el id ${id}`,
      });
    }

    const getEmail = await usuario.get().email;
    const getNumeroDocumento = await usuario.get().numeroDocumento;
    const getNumeroCelular = await usuario.get().numeroCelular;
    const getLogin = await usuario.get().login;

    // =======================================================================
    //                          Actualizar Usuario
    // =======================================================================

    if (getEmail !== email) {
      const existeEmail = await Usuario.findOne({
        where: {
          email: email,
        },
      });
      if (existeEmail) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con este email ${email}`,
        });
      }
    } else if (numeroDocumento) {
      // Valida si recibe el número de documento
      if (getNumeroDocumento !== numeroDocumento) {
        const existeNumeroDocumento = await Usuario.findOne({
          where: {
            numeroDocumento: numeroDocumento,
          },
        });
        if (existeNumeroDocumento) {
          return res.status(400).json({
            ok: false,
            msg: `Ya existe un usuario con este Número de Documento ${numeroDocumento}`,
          });
        }
      }
    } else if (getNumeroCelular !== numeroCelular) {
      const existeNumeroCelular = await Usuario.findOne({
        where: {
          numeroCelular: numeroCelular,
        },
      });
      if (existeNumeroCelular) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con este Número de Celular ${numeroCelular}`,
        });
      }
    } else if (getLogin !== login) {
      const existeLogin = await Usuario.findOne({
        where: {
          login: login,
        },
      });
      if (existeLogin) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un usuario con el login ${login}`,
        });
      }
    }

    // Encriptar contraseña
    if (password) {
      const salt = bcrypt.genSaltSync();
      campos.password = await bcrypt.hashSync(password, salt);
    }

    campos.email = await email;
    campos.numeroDocumento = await numeroDocumento;
    campos.numeroCelular = await numeroCelular;
    campos.login = await login;

    const usuarioActualizado = await usuario.update(campos, { new: true });
    res.json({ ok: true, msg: "Usuario Actualizado", usuarioActualizado });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const usuario = await Usuario.findByPk(id);
    if (usuario) {
      await usuario.update({ estado: false });

      res.json({
        ok: true,
        msg: `Se elminó el usuario ${id}`,
        id,
        usuario,
      });
    }

    if (!usuario) {
      return res.status(404).json({
        msg: `No existe un usuario con el id ${id}`,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hable con el administrador",
    });
  }
};
