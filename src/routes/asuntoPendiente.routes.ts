/* 
  Path: '/api/asunto-pendiente'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  getAsuntosPendientes,
  getAsuntoPendiente,
  getAsuntosPorInforme,
  getAsuntosPendientesPorUsuario,
  crearAsuntoPendiente,
  actualizarAsuntoPendiente,
  copiarAsuntoANuevoInforme,
  marcarAsuntoComoResuelto,
  eliminarAsuntoPendiente,
} from "../controllers/asuntoPendiente.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getAsuntosPendientes);
router.get("/:id", validarJWT, getAsuntoPendiente);

// Rutas para seguimiento de asuntos pendientes
router.get("/informe/:informeId", validarJWT, getAsuntosPorInforme);
router.get(
  "/pendientes/usuario/:usuarioId",
  validarJWT,
  getAsuntosPendientesPorUsuario,
);

router.post(
  "/",
  [
    check("asunto", "El asunto es obligatorio").not().isEmpty(),
    check("descripcion", "La descripción es obligatoria").not().isEmpty(),
    check("informe_id", "El ID del informe es obligatorio").isNumeric(),
    check(
      "tipoStatus_id",
      "El ID del tipo de status es obligatorio",
    ).isNumeric(),
    validarCampos,
    validarJWT,
  ],
  crearAsuntoPendiente,
);

router.post(
  "/copiar",
  [
    check(
      "asunto_id_original",
      "El ID del asunto original es obligatorio",
    ).isNumeric(),
    check(
      "nuevo_informe_id",
      "El ID del nuevo informe es obligatorio",
    ).isNumeric(),
    validarCampos,
    validarJWT,
  ],
  copiarAsuntoANuevoInforme,
);

router.put("/:id", validarJWT, actualizarAsuntoPendiente);

router.put("/:id/resolver", validarJWT, marcarAsuntoComoResuelto);

router.delete("/:id", validarJWT, eliminarAsuntoPendiente);

export default router;
