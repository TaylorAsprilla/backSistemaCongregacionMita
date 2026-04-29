/* 
  Path: '/api/evento-en-vivo'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarEventoEnVivo,
  actualizarEventoEnVivo,
  crearEventoEnVivo,
  eliminarEventoEnVivo,
  getEventosActivos,
  getEventosEnVivo,
  getUltimoEventoEnVivo,
  getUnEventoEnVivo,
} from "../controllers/eventoEnVivo.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

// Rutas de consulta
router.get("/", validarJWT, getEventosEnVivo);
router.get("/activos", validarJWT, getEventosActivos);
router.get("/ultimo", validarJWT, getUltimoEventoEnVivo);
router.get("/:id", validarJWT, getUnEventoEnVivo);

// Crear evento en vivo
router.post(
  "/",
  [
    check("titulo", "El título es obligatorio").not().isEmpty(),
    check("linkTransmision", "El link de transmisión es obligatorio")
      .not()
      .isEmpty(),
    check("plataforma", "La plataforma es obligatoria").not().isEmpty(),
    check("tipoEvento_id", "El tipo de evento es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearEventoEnVivo,
);

// Actualizar evento en vivo
router.put("/:id", validarJWT, actualizarEventoEnVivo);

// Activar evento eliminado
router.put("/activar/:id", validarJWT, activarEventoEnVivo);

// Eliminar (desactivar) evento
router.delete("/:id", validarJWT, eliminarEventoEnVivo);

export default router;
