/* 
  Path: '/api/accesomultimedia'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  crearAccesoCongregacionMultimedia,
  crearAccesoMultimedia,
} from "../controllers/accesoMultimedia.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import {
  eliminarSolicitudMultimediaDeUnUsuario,
  obtenerSolicitudPorUsuario,
} from "../controllers/solicitudMultimedia.controllers";

const router = Router();

router.get("/usuario", validarJWT, obtenerSolicitudPorUsuario);

router.post(
  "/",
  [
    check("login", "Diligencia el Login del usuario ").not().isEmpty(),
    check("password", "Diligencia la contraseña del usuario").not().isEmpty(),
    check("solicitud_id", "El ID de la solicitud es obligatorio")
      .not()
      .isEmpty(),
    check("tiempoAprobacion", "Selecciona el tiempo de aprobación")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearAccesoMultimedia
);

router.post(
  "/congregacion",
  [
    check("email", "El email de la congregación es obligatorio")
      .not()
      .isEmpty()
      .isEmail(),
    check("password", "La contraseña es obligatoria").not().isEmpty(),
    check("idCongregacion", "El ID de la congregación es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearAccesoCongregacionMultimedia
);

router.delete("/usuario", validarJWT, eliminarSolicitudMultimediaDeUnUsuario); // Eliminar una solicitud específica

export default router;
