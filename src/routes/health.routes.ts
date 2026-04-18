/**
 * Health Check Endpoint
 *
 * Proporciona información sobre el estado del servidor y sus dependencias.
 * Útil para:
 * - Load balancers (AWS ELB, nginx)
 * - Monitoreo (Uptime Robot, Pingdom, New Relic)
 * - Kubernetes liveness/readiness probes
 * - CI/CD pipelines
 */

import { Router, Request, Response } from "express";
import db from "../database/connection";
import logger from "../helpers/logger";
import { getEnvReport } from "../helpers/validateEnv";

const router = Router();

/**
 * GET /api/health
 * Health check básico - responde rápido para load balancers
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    // Test rápido de conexión a BD
    await db.authenticate();

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  } catch (error: any) {
    logger.error("Health check failed", { error: error.message });

    res.status(503).json({
      status: "unhealthy",
      error: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/detailed
 * Health check detallado - incluye más información del sistema
 */
router.get("/health/detailed", async (req: Request, res: Response) => {
  const healthStatus: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: require("../../package.json").version,
    uptime: {
      process: process.uptime(),
      formatted: formatUptime(process.uptime()),
    },
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      rss: process.memoryUsage().rss,
      usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    cpu: {
      usage: process.cpuUsage(),
    },
    database: {
      status: "unknown",
      responseTime: 0,
    },
  };

  // Test de base de datos con medición de tiempo
  try {
    const startTime = Date.now();
    await db.authenticate();
    const responseTime = Date.now() - startTime;

    healthStatus.database = {
      status: "connected",
      responseTime: `${responseTime}ms`,
      dialect: db.getDialect(),
    };
  } catch (error: any) {
    healthStatus.status = "degraded";
    healthStatus.database = {
      status: "disconnected",
      error: error.message,
    };
    logger.error("Database health check failed", { error: error.message });
  }

  // Determinar código de estado HTTP
  const statusCode = healthStatus.status === "healthy" ? 200 : 503;

  res.status(statusCode).json(healthStatus);
});

/**
 * GET /api/health/ready
 * Readiness probe - indica si el servidor está listo para recibir tráfico
 */
router.get("/health/ready", async (req: Request, res: Response) => {
  try {
    // Verificar que BD esté disponible
    await db.authenticate();

    // Verificar que variables críticas estén configuradas
    const criticalVars = ["JWT_SECRET", "DB_HOST_DEV"];
    const missingVars = criticalVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      return res.status(503).json({
        ready: false,
        reason: "Missing critical environment variables",
        missing: missingVars,
      });
    }

    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      ready: false,
      reason: "Database not available",
      error: error.message,
    });
  }
});

/**
 * GET /api/health/live
 * Liveness probe - indica si el servidor está vivo (no colgado)
 */
router.get("/health/live", (req: Request, res: Response) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

/**
 * GET /api/health/config
 * Muestra configuración actual (sin secretos)
 * Solo en desarrollo
 */
router.get("/health/config", (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      error: "Config endpoint disabled in production",
    });
  }

  const config = getEnvReport();

  res.json(config);
});

/**
 * Helper: Formatea uptime en formato legible
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

export default router;
