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
  logout,
  renewToken,
  resetPassword,
  checkSession,
  getActiveSessions,
  checkSessionsBeforeLogin,
  closeOtherSessions,
} from "../controllers/login.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

// Renew Token
router.get("/renew", validarJWT, renewToken);

// Check Session - Verificar estado de sesión
router.get("/check-session", validarJWT, checkSession);

// Get Active Sessions - Obtener todas las sesiones activas
router.get("/active-sessions", getActiveSessions);

// Check Sessions Before Login - Verificar sesiones antes de hacer login
router.post(
  "/check-sessions-before-login",
  [
    check("login", "El nombre de usuario es obligatorio").not().isEmpty(),
    check("password", "El password es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  checkSessionsBeforeLogin,
);

// Close Other Sessions - Cerrar otras sesiones del usuario actual
router.post("/close-other-sessions", validarJWT, closeOtherSessions);

// Logout - Cerrar sesión
router.post("/logout", validarJWT, logout);

// Login
router.post(
  "/",
  [
    check("login", "El nombre de usuario es obligatorio").not().isEmpty(),
    check("password", "El password es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  login,
);

// Se olvidó la contraseña
router.put(
  "/forgotpassword",
  [
    check("login", "Se requiere la cuenta de usuario").not().isEmpty(),
    validarCampos,
  ],
  forgotPassword,
);

// Crear una nueva contraseña
router.put(
  "/cambiarpassword",
  [
    check("nuevoPassword", "Se requiere la nueva contraseña").not().isEmpty(),
    validarCampos,
  ],
  crearNuevoPassword,
);

//El usuario cambia su contraseña
router.put(
  "/cambiarpasswordusuario",
  [
    check("login", "El login del usuario es obligatorio").not().isEmpty(),
    check("passwordNuevo", "Se requiere la nueva contraseña").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  cambiarPassword,
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
  resetPassword,
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
  crearLogin,
);

export default router;
