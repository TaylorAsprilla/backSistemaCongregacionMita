/* 
  Path: '/api/campo'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarCampo,
  actualizarCampo,
  crearCampo,
  eliminarCampo,
  getCampo,
  getCampos,
  getCamposPorCongregacion,
} from "../controllers/campo.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import validarApiKey from "../middlewares/validar-apikey";

const router = Router();

// =======================================================================
//                  ENDPOINTS REST API (con autenticación API Key)
// =======================================================================

/**
 * GET /api/campo/v1/campos
 * Endpoint REST para listar TODOS los campos de una congregación
 * Requiere: X-API-KEY header
 * Query params:
 *   - congregacion_id (required): ID de la congregación
 *
 * Retorna todos los campos activos ordenados por nombre
 */
router.get("/camposporcongregacion", validarApiKey, getCamposPorCongregacion);

// =======================================================================
//                  ENDPOINTS LEGACY (con autenticación JWT)
// =======================================================================

router.get("/", validarJWT, getCampos);
router.get("/:id", validarJWT, getCampo);
router.post(
  "/",
  [
    check("campo", "El nombre del campo es obligatorio").not().isEmpty(),
    check(
      "congregacion_id",
      "La congregación al cual pertenece el campo es obligatorio",
    )
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearCampo,
);
router.put("/:id", validarJWT, actualizarCampo);
router.put("/activar/:id", validarJWT, activarCampo);
router.delete("/:id", validarJWT, eliminarCampo);

export default router;
