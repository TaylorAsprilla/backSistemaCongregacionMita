/*
  Path: '/api/notificaciones'
  Centro de notificaciones. El usuario sale siempre del JWT; no hay parámetros para operar sobre otro usuario.
*/
import { Router } from "express";
import validarJWT from "../middlewares/validar-jwt";
import {
  contarNotificacionesNoLeidas,
  eliminarNotificacion,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarNotificacionesLeidas,
} from "../controllers/notificacion.controller";

const router = Router();

router.use(validarJWT);

router.get("/", listarNotificaciones);
router.get("/no-leidas", contarNotificacionesNoLeidas);
// Las rutas fijas van antes que las que reciben :id.
router.patch("/leidas", marcarNotificacionesLeidas);
router.patch("/:id/leida", marcarNotificacionLeida);
router.delete("/:id", eliminarNotificacion);

export default router;
