/* 
  Path: '/api/login'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  cambiarPassword,
  crearLogin,
  crearNuevoPassword,
  envioDeCredenciales,
  forgotPassword,
  login,
  renewToken,
  resetPassword,
} from "../controllers/login.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

// Login
router.post(
  "/",
  [
    check("login", "El nombre de usuario es obligatorio").not().isEmpty(),
    check("password", "El password es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  login
);

// Se olvidó la contraseña
router.put(
  "/forgotpassword",
  [
    check("login", "Se requiere la cuenta de usuario").not().isEmpty(),
    validarCampos,
  ],
  forgotPassword
);

// Crear una nueva contraseña
router.put(
  "/cambiarpassword",
  [
    check("nuevoPassword", "Se requiere la nueva contraseña").not().isEmpty(),
    validarCampos,
  ],
  crearNuevoPassword
);

//El usuario cambia su contraseña
router.put(
  "/cambiarpasswordusuario",
  [
    check("idUsuario", "El identificador del usuario es obligatorio")
      .not()
      .isEmpty(),
    check("login", "El login del usuario es obligatorio").not().isEmpty(),
    check("passwordNuevo", "Se requiere la nueva contraseña").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  cambiarPassword
);

// Envío de credenciales
router.put("/enviocredenciales", envioDeCredenciales);

// El Administrador hace un Reset Password
router.put(
  "/resetpassword",
  [
    check("login", "El login del usuario es obligatorio").not().isEmpty(),
    check("passwordNuevo", "Se requiere la nueva contraseña").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  resetPassword
);

router.put(
  "/crearlogin",
  [
    check("idUsuario", "Se requiere el número Mita del usuario")
      .not()
      .isEmpty(),
    check("login", "El login del usuario es obligatorio").not().isEmpty(),
    check("password", "La contraseña es obligatoria").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearLogin
);

router.get("/renew", validarJWT, renewToken);

export default router;
