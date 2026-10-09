import { Router } from "express";
import {
  getAlertasSupervisionObrero,
  getDetalleUnidadSupervisionObrero,
  getFiltrosSupervisionObrero,
  getResumenSupervisionObrero,
  getTendenciasSupervisionObrero,
  getUnidadesSupervisionObrero,
} from "../controllers/supervisionObrero.controller";
import validarJWT from "../middlewares/validar-jwt";
import validarSupervisionObrero from "../middlewares/validar-supervision-obrero";

const router = Router();

router.use(validarJWT, validarSupervisionObrero);

router.get("/filtros", getFiltrosSupervisionObrero);
router.get("/resumen", getResumenSupervisionObrero);
router.get("/tendencias", getTendenciasSupervisionObrero);
router.get("/alertas", getAlertasSupervisionObrero);
router.get("/unidades", getUnidadesSupervisionObrero);
router.get("/unidades/:tipo/:id", getDetalleUnidadSupervisionObrero);

export default router;
