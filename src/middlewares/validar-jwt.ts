import { NextFunction, Request, Response } from "express";
import { validateUserSession } from "../helpers/session.service";

const jwt = require("jsonwebtoken");

/**
 * Interface extendida de Request que incluye información del usuario autenticado
 */
export interface CustomRequest extends Request {
  id?: number;
  login?: string;
  sessionId?: string;
  email?: string;
  sessionType?: "NORMAL" | "QR";
  isLoginCodeQr?: boolean;
}

/**
 * Middleware de validación de JWT con control de sesión única
 *
 * Este middleware realiza las siguientes validaciones:
 * 1. Verifica que exista el token en el header 'x-token'
 * 2. Verifica que el token sea válido y esté firmado correctamente
 * 3. Valida que la sesión (sessionId) exista en la base de datos
 * 4. Valida que la sesión esté activa (no haya sido invalidada por nuevo login)
 * 5. Verifica que la sesión no haya expirado
 *
 * Códigos de error posibles:
 * - NO_TOKEN: No se proporcionó token en la petición
 * - TOKEN_INVALID: El token no es válido o está mal firmado
 * - TOKEN_EXPIRED: El token expiró (error estándar de JWT)
 * - SESSION_NOT_FOUND: La sesión no existe en base de datos
 * - SESSION_REPLACED: La sesión fue invalidada por login en otro dispositivo
 * - SESSION_INVALIDATED: La sesión fue invalidada manualmente
 * - SESSION_EXPIRED: La sesión expiró según la base de datos
 */
const validarJWT = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header("x-token");

  // Validación 1: Verificar que existe el token
  if (!token) {
    console.warn(
      `[AUTH] NO_TOKEN | IP: ${req.ip} | Path: ${req.path} | UserAgent: ${req.get("user-agent")?.substring(0, 50)}`,
    );
    return res.status(401).json({
      success: false,
      code: "NO_TOKEN",
      message: "No hay token en la petición",
    });
  }

  try {
    // Validación 2: Verificar y decodificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, login, sessionId, email } = decoded;

    // Validación 3: Verificar que el token incluye sessionId
    if (!sessionId) {
      console.warn(
        `[AUTH] TOKEN_INVALID (No SessionId) | User: ${id} | IP: ${req.ip} | Path: ${req.path}`,
      );
      return res.status(401).json({
        success: false,
        code: "TOKEN_INVALID",
        message: "Token no válido: falta identificador de sesión",
      });
    }

    // Validación 4: Validar la sesión contra la base de datos
    const sessionValidation = await validateUserSession(sessionId, id);

    if (!sessionValidation.isValid) {
      // Logging detallado del error de sesión
      console.warn(
        `[AUTH] ${sessionValidation.code} | User: ${id} | Session: ${sessionId} | IP: ${req.ip} | Path: ${req.path} | Reason: ${sessionValidation.error}`,
      );

      // La sesión no es válida - retornar error específico
      const errorResponse: any = {
        success: false,
        code: sessionValidation.code,
        message: sessionValidation.error,
      };

      // Si hay información de la nueva sesión (SESSION_REPLACED), incluirla
      if (sessionValidation.newSessionInfo) {
        errorResponse.newSessionInfo = sessionValidation.newSessionInfo;
      }

      return res.status(401).json(errorResponse);
    }

    // Sesión válida - agregar información al request
    req.id = id;
    req.login = login;
    req.sessionId = sessionId;
    req.email = email;
    req.sessionType = sessionValidation.sessionType || "NORMAL";
    req.isLoginCodeQr = sessionValidation.isLoginCodeQr || false;

    // Continuar con el siguiente middleware
    next();
  } catch (error: any) {
    // Manejo de errores de JWT
    if (error.name === "TokenExpiredError") {
      console.warn(
        `[AUTH] TOKEN_EXPIRED | IP: ${req.ip} | Path: ${req.path} | ExpiredAt: ${error.expiredAt}`,
      );
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "El token ha expirado",
        expiredAt: error.expiredAt,
      });
    }

    if (error.name === "JsonWebTokenError") {
      console.warn(
        `[AUTH] TOKEN_INVALID (JWT Error) | IP: ${req.ip} | Path: ${req.path} | Error: ${error.message}`,
      );
      return res.status(401).json({
        success: false,
        code: "TOKEN_INVALID",
        message: "Token no válido",
      });
    }

    // Error genérico
    console.error(
      `[AUTH] AUTH_ERROR | IP: ${req.ip} | Path: ${req.path} | Error:`,
      error,
    );
    return res.status(401).json({
      success: false,
      code: "AUTH_ERROR",
      message: "Error en la autenticación",
    });
  }
};

export default validarJWT;
