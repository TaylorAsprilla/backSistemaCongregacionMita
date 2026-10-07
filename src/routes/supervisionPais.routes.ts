import { Router } from "express";
import {
  getAlertasSupervisionPais,
  getDetalleUnidadSupervisionPais,
  getFiltrosSupervisionPais,
  getResumenSupervisionPais,
  getTendenciasSupervisionPais,
  getUnidadesSupervisionPais,
} from "../controllers/supervisionPais.controller";
import validarJWT from "../middlewares/validar-jwt";
import validarSupervisionPais from "../middlewares/validar-supervision-pais";

const router = Router();

router.use(validarJWT, validarSupervisionPais);

router.get("/filtros", getFiltrosSupervisionPais);
router.get("/resumen", getResumenSupervisionPais);
router.get("/tendencias", getTendenciasSupervisionPais);
router.get("/alertas", getAlertasSupervisionPais);
router.get("/unidades", getUnidadesSupervisionPais);
router.get("/unidades/:tipo/:id", getDetalleUnidadSupervisionPais);

export default router;
