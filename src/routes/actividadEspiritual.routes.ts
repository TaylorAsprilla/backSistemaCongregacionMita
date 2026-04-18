/* 
  Path: '/api/actividadEspiritual'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  getActividadEspiritualPorInforme,
  crearActividadEspiritual,
  actualizarActividadEspiritual,
  eliminarActividadEspiritual,
} from "../controllers/actividadEspiritual.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/informe/:informeId", validarJWT, getActividadEspiritualPorInforme);

router.post(
  "/",
  [
    check("informe_id", "El ID del informe es obligatorio").isNumeric(),
    check("categoria_id", "El ID de la categoría es obligatorio").isNumeric(),
    check("fecha", "La fecha es obligatoria y debe ser válida").isDate(),
    check("observaciones", "Las observaciones son obligatorias")
      .not()
      .isEmpty(),
    check("responsable", "El responsable es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearActividadEspiritual,
);

router.put(
  "/:id",
  [
    check("fecha", "La fecha debe ser válida").optional().isDate(),
    check("observaciones", "Las observaciones son obligatorias")
      .optional()
      .not()
      .isEmpty(),
    check("responsable", "El responsable es obligatorio")
      .optional()
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarActividadEspiritual,
);

router.delete("/:id", validarJWT, eliminarActividadEspiritual);

export default router;
