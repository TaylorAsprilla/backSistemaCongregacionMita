/**
 * Configuración de Rate Limiting
 *
 * Protege endpoints sensibles contra ataques de fuerza bruta y abuso.
 * Para 1000 usuarios concurrentes, estos límites son razonables.
 */

import rateLimit from "express-rate-limit";

/**
 * Rate limiter general para toda la API
 * Limita a 100 requests por 15 minutos por IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: {
    ok: false,
    code: "RATE_LIMIT_EXCEEDED",
    msg: "Demasiadas peticiones desde esta IP, por favor intente más tarde",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Almacenar en memoria (para producción considerar Redis)
  // store: new RedisStore({ client: redisClient }),
});

/**
 * Rate limiter estricto para login
 * Limita a 5 intentos por 15 minutos para prevenir fuerza bruta
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos de login
  message: {
    ok: false,
    code: "TOO_MANY_LOGIN_ATTEMPTS",
    msg: "Demasiados intentos de inicio de sesión. Por favor intente después de 15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar logins exitosos
});

/**
 * Rate limiter para registro de usuarios
 * Limita creación de cuentas para prevenir spam
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora
  message: {
    ok: false,
    code: "REGISTRATION_LIMIT_EXCEEDED",
    msg: "Demasiados registros desde esta IP. Por favor intente más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para recuperación de contraseña
 * Previene abuso del sistema de email
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 solicitudes por hora
  message: {
    ok: false,
    code: "PASSWORD_RESET_LIMIT_EXCEEDED",
    msg: "Demasiadas solicitudes de recuperación de contraseña. Por favor intente más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para endpoints de creación (POST)
 * Previene spam de creación de registros
 */
export const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // 20 creaciones por ventana
  message: {
    ok: false,
    code: "CREATE_LIMIT_EXCEEDED",
    msg: "Demasiadas operaciones de creación. Por favor intente más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // No aplicar límite a operaciones GET
    return req.method === "GET";
  },
});

/**
 * Rate limiter para búsquedas
 * Previene scraping masivo de datos
 */
export const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 50, // 50 búsquedas
  message: {
    ok: false,
    code: "SEARCH_LIMIT_EXCEEDED",
    msg: "Demasiadas búsquedas. Por favor intente más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para email (notificaciones, etc)
 * Previene abuso del servicio de email
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 emails por hora
  message: {
    ok: false,
    code: "EMAIL_LIMIT_EXCEEDED",
    msg: "Demasiados correos enviados. Por favor intente más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter permisivo para operaciones de lectura
 * Para usuarios autenticados que necesitan consultar datos frecuentemente
 */
export const readLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 200, // 200 requests de lectura
  message: {
    ok: false,
    code: "READ_LIMIT_EXCEEDED",
    msg: "Demasiadas consultas. Por favor intente más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Solo aplicar a GET
    return req.method !== "GET";
  },
});
