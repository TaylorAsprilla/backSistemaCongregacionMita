/**
 * Middleware Global de Manejo de Errores
 *
 * Este middleware captura todos los errores no manejados en la aplicación
 * y proporciona respuestas consistentes al cliente mientras registra
 * información detallada del error para debugging.
 */

import { Request, Response, NextFunction } from "express";
import logger, { logError } from "../helpers/logger";

/**
 * Errores personalizados de la aplicación
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware principal de manejo de errores
 * Debe colocarse DESPUÉS de todas las rutas en server.model.ts
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isDev = process.env.NODE_ENV === "development";

  // Valores por defecto
  let statusCode = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";
  let errorCode = err.code || "INTERNAL_ERROR";

  // Logging del error con contexto
  logError(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).id,
    body: isDev ? req.body : undefined,
    params: req.params,
    query: req.query,
  });

  // Manejo de errores específicos de Sequelize
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = "Error de validación";
    errorCode = "VALIDATION_ERROR";

    // Extraer mensajes de validación
    const validationErrors = err.errors?.map((e: any) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(statusCode).json({
      ok: false,
      code: errorCode,
      msg: message,
      errors: validationErrors,
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    message = "El registro ya existe";
    errorCode = "DUPLICATE_ENTRY";

    return res.status(statusCode).json({
      ok: false,
      code: errorCode,
      msg: message,
      field: err.errors?.[0]?.path,
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    statusCode = 400;
    message = "Referencia inválida a otro registro";
    errorCode = "FOREIGN_KEY_ERROR";
  }

  if (err.name === "SequelizeDatabaseError") {
    statusCode = 500;
    message = "Error de base de datos";
    errorCode = "DATABASE_ERROR";
  }

  // Errores de JWT
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token inválido";
    errorCode = "INVALID_TOKEN";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expirado";
    errorCode = "TOKEN_EXPIRED";
  }

  // Errores de validación de express-validator
  if (err.type === "ValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
  }

  // Respuesta al cliente
  const errorResponse: any = {
    ok: false,
    code: errorCode,
    msg: isDev
      ? message
      : statusCode === 500
        ? "Error interno del servidor"
        : message,
  };

  // Solo incluir stack trace en desarrollo
  if (isDev) {
    errorResponse.stack = err.stack;
    errorResponse.error = err;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para rutas no encontradas (404)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = new AppError(
    `Ruta no encontrada: ${req.method} ${req.path}`,
    404,
    true,
    "NOT_FOUND",
  );

  next(error);
};

/**
 * Manejo de errores asíncronos
 * Wrapper para funciones async en controllers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Manejo de errores no capturados (último recurso)
 */
export const setupGlobalErrorHandlers = () => {
  // Errores no capturados en promises
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.error("Unhandled Rejection detectado", {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise,
    });

    // En producción, no hacer exit para mantener el servidor corriendo
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

  // Excepciones no capturadas
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception detectado", {
      error: error.message,
      stack: error.stack,
    });

    // Siempre salir en uncaught exception
    process.exit(1);
  });

  // Señal de terminación (Ctrl+C, kill)
  process.on("SIGTERM", () => {
    logger.info("SIGTERM recibido. Cerrando servidor gracefully...");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT recibido. Cerrando servidor gracefully...");
    process.exit(0);
  });
};
