/*
  Path: '/api/dashboard-supervision'
  Dashboard Ejecutivo de Supervisión Congregacional (sólo lectura, rol ADMINISTRADOR).
*/
import { Router } from "express";
import {
  getAlertas,
  getDetalleUnidad,
  getFiltros,
  getResumen,
  getTendencias,
  getUnidades,
} from "../controllers/dashboardSupervision.controller";
import { DASHBOARD_SUPERVISION_CONFIG } from "../config/dashboardSupervision.config";
import validarJWT from "../middlewares/validar-jwt";
import { crearValidadorRoles } from "../middlewares/validar-roles";
import { obtenerPermisosUsuario } from "../services/dashboardSupervision/consultas";

const router = Router();

const validarRolSupervision = crearValidadorRoles(
  DASHBOARD_SUPERVISION_CONFIG.rolesAutorizados,
  obtenerPermisosUsuario,
);

router.use(validarJWT, validarRolSupervision);

router.get("/filtros", getFiltros);
router.get("/resumen", getResumen);
router.get("/tendencias", getTendencias);
router.get("/alertas", getAlertas);
router.get("/unidades", getUnidades);
router.get("/unidades/:tipo/:id", getDetalleUnidad);

export default router;
