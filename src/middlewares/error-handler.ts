import { Request, Response, NextFunction } from "express";
import { ValidationError } from "sequelize";

/**
 * Middleware de manejo centralizado de errores
 *
 * Debe ser el último middleware en server.model.ts
 */

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Middleware principal de manejo de errores
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Valores por defecto
  let statusCode = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";
  let code = err.code || "INTERNAL_ERROR";

  // Log del error
  if (statusCode >= 500) {
    console.error(
      `[ERROR] ${code} | ${req.method} ${req.path} | IP: ${req.ip}`,
    );
    console.error(err.stack);
  } else {
    console.warn(
      `[WARN] ${code} | ${req.method} ${req.path} | IP: ${req.ip} | Message: ${message}`,
    );
  }

  // Manejo específico por tipo de error

  // 1. Errores de validación de Sequelize
  if (err instanceof ValidationError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Error de validación en los datos";

    const validationErrors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(statusCode).json({
      success: false,
      code,
      message,
      errors: validationErrors,
    });
  }

  // 2. Errores de conexión a base de datos
  if (err.name === "SequelizeConnectionError") {
    statusCode = 503;
    code = "DATABASE_CONNECTION_ERROR";
    message = "Error de conexión a la base de datos";
  }

  // 3. Errores de timeout
  if (err.name === "SequelizeTimeoutError") {
    statusCode = 504;
    code = "DATABASE_TIMEOUT";
    message = "La consulta tardó demasiado tiempo";
  }

  // 4. Errores de constraint único (duplicados)
  if (err.name === "SequelizeUniqueConstraintError") {
    statusCode = 409;
    code = "DUPLICATE_ENTRY";
    message = "El registro ya existe";
  }

  // 5. No incluir stack trace en producción
  const response: any = {
    success: false,
    code,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Solo incluir detalles técnicos en desarrollo
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.originalError = err.message;
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware para capturar rutas no encontradas (404)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.warn(`[404] ${req.method} ${req.path} | IP: ${req.ip}`);

  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Wrapper para async controllers
 * Evita tener que usar try-catch en cada controller
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
