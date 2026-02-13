import { NextFunction, Request, Response } from "express";

/**
 * Configuración de rate limiting
 */
interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Número máximo de requests en la ventana
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Storage para tracking de requests por IP
 */
interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Middleware de rate limiting básico por IP
 * Implementación simple en memoria (para producción considerar Redis)
 *
 * @param config Configuración del rate limiter
 * @returns Express middleware
 *
 * @example
 * // Limitar a 100 requests por minuto
 * router.get('/endpoint', rateLimitByIp({ windowMs: 60000, maxRequests: 100 }), handler);
 *
 * // Limitar a 10 requests por 10 segundos
 * router.get('/endpoint', rateLimitByIp({ windowMs: 10000, maxRequests: 10 }), handler);
 */
export const rateLimitByIp = (config: RateLimitConfig) => {
  const store: RateLimitStore = {};

  const {
    windowMs,
    maxRequests,
    message = "Demasiados requests desde esta IP, intente nuevamente más tarde",
    skipSuccessfulRequests = false,
  } = config;

  // Limpieza periódica del store (cada minuto)
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach((ip) => {
      if (store[ip].resetTime < now) {
        delete store[ip];
      }
    });
  }, 60000);

  return (req: Request, res: Response, next: NextFunction) => {
    // Obtener IP del cliente (considera proxies)
    const forwardedFor = req.headers["x-forwarded-for"];
    const xRealIp = req.headers["x-real-ip"];

    let ip: string = "unknown";

    if (typeof forwardedFor === "string") {
      ip = forwardedFor.split(",")[0].trim();
    } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      ip = forwardedFor[0].split(",")[0].trim();
    } else if (typeof xRealIp === "string") {
      ip = xRealIp;
    } else if (req.ip) {
      ip = req.ip;
    } else if (req.socket.remoteAddress) {
      ip = req.socket.remoteAddress;
    }

    const now = Date.now();

    // Inicializar o resetear contador si la ventana expiró
    if (!store[ip] || store[ip].resetTime < now) {
      store[ip] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Incrementar contador
    store[ip].count++;

    // Headers informativos
    const remaining = Math.max(0, maxRequests - store[ip].count);
    const resetTime = Math.ceil((store[ip].resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", resetTime.toString());

    // Verificar límite
    if (store[ip].count > maxRequests) {
      res.setHeader("Retry-After", resetTime.toString());
      return res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
          details: {
            limit: maxRequests,
            windowMs,
            retryAfter: resetTime,
          },
        },
      });
    }

    // Si está configurado para skip successful requests, decrementar después de la respuesta
    if (skipSuccessfulRequests) {
      res.on("finish", () => {
        if (res.statusCode < 400) {
          store[ip].count = Math.max(0, store[ip].count - 1);
        }
      });
    }

    next();
  };
};

/**
 * Configuración preset para rate limiting de API
 */
export const rateLimitPresets = {
  /**
   * Estricto: 10 requests por minuto
   */
  strict: { windowMs: 60000, maxRequests: 10 },

  /**
   * Moderado: 100 requests por minuto
   */
  moderate: { windowMs: 60000, maxRequests: 100 },

  /**
   * Permisivo: 1000 requests por minuto
   */
  lenient: { windowMs: 60000, maxRequests: 1000 },

  /**
   * Burst: 50 requests por 10 segundos
   */
  burst: { windowMs: 10000, maxRequests: 50 },
};

export default rateLimitByIp;
