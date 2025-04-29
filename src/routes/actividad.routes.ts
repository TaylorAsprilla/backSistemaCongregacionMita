/* 
  Path: '/api/actividad'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarActividad,
  crearActividad,
  getActividad,
} from "../controllers/actividad.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getActividad);
router.post(
  "/",
  [
    check("fecha", "La fecha de la actividad es obligatoria ").not().isEmpty(),
    check("asistencia", "La asistencia de la actividad es obligatoria")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    check("tipoActividad_id", "Debe selecionar el tipo de actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearActividad
);
router.put("/:id", validarJWT, actualizarActividad);

export default router;
