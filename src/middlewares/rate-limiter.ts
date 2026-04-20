import { Request, Response, NextFunction } from "express";

/**
 * Simple Rate Limiter basado en IP
 *
 * Limita el número de requests por IP en una ventana de tiempo
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Limpieza automática cada 5 minutos
setInterval(
  () => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  },
  5 * 60 * 1000,
);

/**
 * Rate Limiter Middleware
 *
 * @param maxRequests - Número máximo de requests permitidas
 * @param windowMs - Ventana de tiempo en milisegundos
 * @param message - Mensaje personalizado
 */
export const rateLimiter = (
  maxRequests: number = 100,
  windowMs: number = 60 * 1000,
  message: string = "Demasiadas solicitudes desde esta IP, por favor intente más tarde",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || "unknown";
    const now = Date.now();

    // Inicializar o resetear contador si expiró
    if (!store[ip] || store[ip].resetTime < now) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // Incrementar contador
    store[ip].count++;

    // Verificar límite
    if (store[ip].count > maxRequests) {
      const timeLeft = Math.ceil((store[ip].resetTime - now) / 1000);

      console.warn(
        `[RATE_LIMIT] IP: ${ip} | Path: ${req.path} | Count: ${store[ip].count}/${maxRequests} | Retry in: ${timeLeft}s`,
      );

      return res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: message,
        retryAfter: timeLeft,
      });
    }

    // Headers informativos
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader(
      "X-RateLimit-Remaining",
      (maxRequests - store[ip].count).toString(),
    );
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(store[ip].resetTime).toISOString(),
    );

    next();
  };
};

/**
 * Rate Limiter estricto para endpoints sensibles
 */
export const strictRateLimiter = rateLimiter(
  10, // 10 requests
  60 * 1000, // por minuto
  "Demasiados intentos. Por favor espere antes de reintentar",
);

/**
 * Rate Limiter moderado para endpoints generales
 */
export const moderateRateLimiter = rateLimiter(
  100, // 100 requests
  60 * 1000, // por minuto
  "Límite de solicitudes excedido",
);

/**
 * Rate Limiter permisivo para lectura
 */
export const permissiveRateLimiter = rateLimiter(
  300, // 300 requests
  60 * 1000, // por minuto
);
