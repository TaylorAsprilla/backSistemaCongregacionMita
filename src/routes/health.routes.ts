import { Router } from "express";
import {
  healthCheck,
  readinessCheck,
  livenessCheck,
} from "../controllers/health.controller";

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check detallado
 * @access  Public
 */
router.get("/", healthCheck);

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe (para load balancers)
 * @access  Public
 */
router.get("/ready", readinessCheck);

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe (para orchestrators)
 * @access  Public
 */
router.get("/live", livenessCheck);

export default router;
