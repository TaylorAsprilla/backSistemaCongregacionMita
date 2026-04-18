/**
 * Sistema de Logging centralizado con Winston
 *
 * Niveles de log:
 * - error: Errores críticos que requieren atención inmediata
 * - warn: Advertencias que no detienen la ejecución
 * - info: Información general del sistema
 * - debug: Información detallada para debugging (solo desarrollo)
 *
 * Los logs se guardan en:
 * - logs/error.log: Solo errores
 * - logs/combined.log: Todos los niveles
 * - Console: Solo en desarrollo
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logDir = "logs";
const env = process.env.NODE_ENV || "development";
const isDev = env === "development";

// Formato personalizado para desarrollo (legible)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Agregar metadata si existe
    const metadataStr = Object.keys(metadata).length
      ? "\n" + JSON.stringify(metadata, null, 2)
      : "";

    return msg + metadataStr;
  }),
);

// Formato para producción (JSON estructurado)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Configuración de transports
const transports: winston.transport[] = [];

// Archivo para todos los logs con rotación diaria
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, "combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d", // Mantener logs de 14 días
    level: "info",
  }),
);

// Archivo solo para errores con rotación
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "30d", // Mantener errores por 30 días
    level: "error",
  }),
);

// Console solo en desarrollo
if (isDev) {
  transports.push(
    new winston.transports.Console({
      format: devFormat,
    }),
  );
}

// Crear logger
const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  format: isDev ? devFormat : prodFormat,
  transports,
  exitOnError: false,
});

// Helper para logging de requests HTTP
export const logRequest = (req: any, statusCode: number, duration: number) => {
  logger.info("HTTP Request", {
    method: req.method,
    url: req.url,
    statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
};

// Helper para logging de errores con contexto
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
};

export default logger;
