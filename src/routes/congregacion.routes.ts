/* 
  Path: '/api/congregacion'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarCongregacion,
  actualizarCongregacion,
  crearCongregacion,
  eliminarCongregacion,
  getCongregacion,
  getCongregaciones,
  getCongregacionesPorPais,
} from "../controllers/congregacion.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import validarApiKey from "../middlewares/validar-apikey";
// import { rateLimitByIp, rateLimitPresets } from "../middlewares/rate-limit";

const router = Router();

// =======================================================================
//                  ENDPOINTS REST API (con autenticación API Key)
// =======================================================================

/**
 * GET /api/congregacion/v1/congregaciones
 * Endpoint REST para listar TODAS las congregaciones de un país
 * Requiere: X-API-KEY header
 * Query params:
 *   - id_pais (required): ID del país
 *
 * Retorna todas las congregaciones activas ordenadas por nombre (sin paginación)
 *
 * Rate limiting: Para habilitar rate limiting, descomenta la importación arriba y agrega:
 *   router.get("/v1/congregaciones",
 *     validarApiKey,
 *     rateLimitByIp(rateLimitPresets.moderate),  // 100 req/min
 *     getCongregacionesPorPais
 *   );
 */
router.get("/congregacionesporpais", validarApiKey, getCongregacionesPorPais);

// =======================================================================
//                  ENDPOINTS LEGACY (con autenticación JWT)
// =======================================================================

router.get("/", getCongregaciones);
router.get("/:id", validarJWT, getCongregacion);
router.post(
  "/",
  [
    check("congregacion", "El nombre de la congregación es obligatorio ")
      .not()
      .isEmpty(),
    check("pais_id", "El pais es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearCongregacion,
);
router.put("/:id", validarJWT, actualizarCongregacion);
router.put("/activar/:id", validarJWT, activarCongregacion);
router.delete("/:id", validarJWT, eliminarCongregacion);

export default router;
