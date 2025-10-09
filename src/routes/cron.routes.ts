/*
  Path: '/api/cron'
*/

import { Router } from "express";

import validarJWT from "../middlewares/validar-jwt";
import { testNotifyPendingRequests } from "../controllers/cron.controller";

const router = Router();

// Endpoint para probar el cron de notificaciones manualmente (solo para desarrollo)
router.post("/test-notifications", validarJWT, testNotifyPendingRequests);

export default router;
