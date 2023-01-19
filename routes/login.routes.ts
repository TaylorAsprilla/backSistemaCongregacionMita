/* 
  Path: '/api/login'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  cambiarpassword,
  crearNuevoPassword,
  forgotPassword,
  login,
  renewToken,
} from "../controllers/login.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

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
  cambiarpassword
);

router.get("/renew", validarJWT, renewToken);

export default router;
