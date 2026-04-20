import { Request, Response } from "express";
import db from "../database/connection";

/**
 * Health Check Endpoint
 * Verifica el estado de la aplicación y sus dependencias
 *
 * GET /api/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  const healthStatus: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: "unknown",
      memory: "unknown",
    },
  };

  let httpStatus = 200;

  try {
    // 1. Verificar conexión a base de datos
    await db.authenticate();
    healthStatus.checks.database = "healthy";
  } catch (error) {
    console.error("[HEALTH] Database check failed:", error);
    healthStatus.checks.database = "unhealthy";
    healthStatus.status = "degraded";
    httpStatus = 503;
  }

  // 2. Verificar uso de memoria
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };

  healthStatus.checks.memory = {
    status: memoryUsageMB.heapUsed < 1024 ? "healthy" : "warning",
    usage: memoryUsageMB,
  };

  res.status(httpStatus).json(healthStatus);
};

/**
 * Readiness Check - Para Kubernetes/ECS
 * Indica si la aplicación está lista para recibir tráfico
 *
 * GET /api/health/ready
 */
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    await db.authenticate();
    res.status(200).json({ status: "ready" });
  } catch (error) {
    console.error("[HEALTH] Readiness check failed:", error);
    res
      .status(503)
      .json({ status: "not_ready", error: "Database unavailable" });
  }
};

/**
 * Liveness Check - Para Kubernetes/ECS
 * Indica si la aplicación está viva (no debe reiniciarse)
 *
 * GET /api/health/live
 */
export const livenessCheck = (req: Request, res: Response) => {
  res.status(200).json({ status: "alive" });
};
