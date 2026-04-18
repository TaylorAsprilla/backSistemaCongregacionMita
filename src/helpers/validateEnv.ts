/**
 * Validador de Variables de Entorno
 *
 * Valida que todas las variables críticas estén definidas antes de iniciar el servidor.
 * Esto previene errores en runtime por configuración faltante.
 */

import logger from "./logger";

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfigs: Record<string, EnvConfig> = {
  development: {
    required: [
      "NODE_ENV",
      "JWT_SECRET",
      "DB_USERNAME_DEV",
      "DB_PASSWORD_DEV",
      "DB_DATABASE_DEV",
      "DB_HOST_DEV",
    ],
    optional: [
      "PORT",
      "HOST_EMAIL_DEVELOPMENT",
      "USER_EMAIL_DEVELOPMENT",
      "PASS_EMAIL_DEVELOPMENT",
    ],
  },

  production: {
    required: [
      "NODE_ENV",
      "JWT_SECRET",
      "JWT_SECRET_RESET",
      "DB_USERNAME_PROD",
      "DB_PASSWORD_PROD",
      "DB_DATABASE_PROD",
      "DB_HOST_PROD",
      "HOST_EMAIL_PRODUCTION",
      "PORT_EMAIL_PRODUCTION",
      "USER_EMAIL_PRODUCTION",
      "PASS_EMAIL_PRODUCTION",
      "FROM_EMAIL_PRODUCTION",
      "IP_API",
      "LOGIN_POR_QR_PROD",
    ],
    optional: ["PORT", "SIN_CONGREGACION", "SIN_CAMPO"],
  },

  qa: {
    required: [
      "NODE_ENV",
      "JWT_SECRET",
      "JWT_SECRET_RESET",
      "DB_USERNAME_QA",
      "DB_PASSWORD_QA",
      "DB_DATABASE_QA",
      "DB_HOST",
      "HOST_EMAIL_PRODUCTION",
      "USER_EMAIL_PRODUCTION",
      "PASS_EMAIL_PRODUCTION",
      "IP_API",
      "LOGIN_POR_QR_QA",
    ],
    optional: ["PORT"],
  },

  docker: {
    required: ["NODE_ENV"],
    optional: [
      "JWT_SECRET_RESET",
      "HOST_EMAIL_DEVELOPMENT",
      "USER_EMAIL_DEVELOPMENT",
      "PASS_EMAIL_DEVELOPMENT",
    ],
  },
};

/**
 * Valida que las variables de entorno requeridas estén definidas
 * @throws Error si faltan variables críticas
 */
export const validateEnv = (): void => {
  const env = process.env.NODE_ENV || "development";
  const config = envConfigs[env];

  if (!config) {
    logger.warn(`No hay configuración de validación para entorno: ${env}`);
    return;
  }

  const missing: string[] = [];
  const empty: string[] = [];

  // Verificar variables requeridas
  config.required.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else if (process.env[varName]?.trim() === "") {
      empty.push(varName);
    }
  });

  // Advertir sobre variables opcionales faltantes
  const missingOptional: string[] = [];
  config.optional.forEach((varName) => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  });

  // Reportar resultados
  if (missing.length > 0) {
    const errorMsg = `❌ Variables de entorno REQUERIDAS faltantes en ${env}:\n  - ${missing.join("\n  - ")}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (empty.length > 0) {
    const errorMsg = `❌ Variables de entorno VACÍAS en ${env}:\n  - ${empty.join("\n  - ")}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (missingOptional.length > 0) {
    logger.warn(
      `⚠️  Variables opcionales no definidas en ${env}:\n  - ${missingOptional.join("\n  - ")}`,
    );
  }

  // Validaciones específicas
  validateJWTSecret();
  validateDatabaseConfig(env);

  logger.info(`✅ Variables de entorno validadas correctamente para: ${env}`);
};

/**
 * Valida que JWT_SECRET tenga suficiente seguridad
 */
const validateJWTSecret = (): void => {
  const secret = process.env.JWT_SECRET;

  if (!secret) return; // Ya se validó en required

  if (secret.length < 32) {
    logger.warn(
      "⚠️  JWT_SECRET debería tener al menos 32 caracteres para mayor seguridad",
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    (secret.includes("example") ||
      secret.includes("change-me") ||
      secret.includes("secret"))
  ) {
    throw new Error(
      "❌ JWT_SECRET en producción parece ser un valor de ejemplo. Usa un secreto seguro.",
    );
  }
};

/**
 * Valida configuración de base de datos
 */
const validateDatabaseConfig = (env: string): void => {
  const dialectVar = "DB_DIALECT";
  const dialect = process.env[dialectVar] || "mysql";

  if (!["mysql", "postgres", "mariadb"].includes(dialect)) {
    logger.warn(`⚠️  ${dialectVar}="${dialect}" no es un dialecto estándar`);
  }

  // Advertir si se usa localhost en producción
  if (env === "production") {
    const host = process.env.DB_HOST_PROD;
    if (host === "localhost" || host === "127.0.0.1") {
      logger.warn(
        "⚠️  DB_HOST_PROD apunta a localhost. ¿Seguro que la BD está en el mismo servidor?",
      );
    }
  }
};

/**
 * Genera un reporte de configuración (sin valores sensibles)
 */
export const getEnvReport = (): Record<string, any> => {
  const env = process.env.NODE_ENV || "development";
  const config = envConfigs[env];

  if (!config) {
    return { error: "No config for environment" };
  }

  const report: Record<string, any> = {
    environment: env,
    node_version: process.version,
    required_vars: {},
    optional_vars: {},
  };

  // Verificar required
  config.required.forEach((varName) => {
    if (
      varName.includes("SECRET") ||
      varName.includes("PASSWORD") ||
      varName.includes("PASS")
    ) {
      report.required_vars[varName] = process.env[varName]
        ? "***SET***"
        : "⚠️ MISSING";
    } else {
      report.required_vars[varName] = process.env[varName] || "⚠️ MISSING";
    }
  });

  // Verificar optional
  config.optional.forEach((varName) => {
    if (
      varName.includes("SECRET") ||
      varName.includes("PASSWORD") ||
      varName.includes("PASS")
    ) {
      report.optional_vars[varName] = process.env[varName]
        ? "***SET***"
        : "not set";
    } else {
      report.optional_vars[varName] = process.env[varName] || "not set";
    }
  });

  return report;
};
