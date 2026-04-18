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
  getActiveSessionsByType,
  getActiveQrSessions,
  logoutQrSession,
} from "../controllers/login.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { loginLimiter, passwordResetLimiter } from "../config/rateLimiting";

const router = Router();

// Renew Token
router.get("/renew", validarJWT, renewToken);

// Check Session - Verificar estado de sesión
router.get("/check-session", validarJWT, checkSession);

// Get Active Sessions - Obtener todas las sesiones activas
router.get("/active-sessions", getActiveSessions);

// Sesiones activas agrupadas por tipo (NORMAL / QR)
router.get("/active-sessions/by-type", getActiveSessionsByType);

// Sesiones QR activas en tiempo real
router.get("/active-sessions/qr", getActiveQrSessions);

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

// Close Other Sessions - Cerrar otras sesiones NORMAL del usuario actual
router.post("/close-other-sessions", validarJWT, closeOtherSessions);

// Logout QR - Cerrar una sesión QR específica por sessionId
router.post("/logout-qr", validarJWT, logoutQrSession);

// Logout - Cerrar sesión
router.post("/logout", validarJWT, logout);

// Login (con rate limiting estricto)
router.post(
  "/",
  loginLimiter, // Protección contra fuerza bruta
  [
    check("login", "El nombre de usuario es obligatorio").not().isEmpty(),
    check("password", "El password es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  login,
);

// Se olvidó la contraseña (con rate limiting)
router.put(
  "/forgotpassword",
  passwordResetLimiter, // Protección contra abuso de email
  [
    check("login", "Se requiere la cuenta de usuario").not().isEmpty(),
    validarCampos,
  ],
  forgotPassword,
);

// Crear una nueva contraseña (con rate limiting)
router.put(
  "/cambiarpassword",
  passwordResetLimiter,
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
