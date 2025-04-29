/* 
  Path: '/api/situacionvisita'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarSituacionVisita,
  crearSituacionVisita,
  getSituacionVisita,
} from "../controllers/situacionVisita.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getSituacionVisita);
router.post(
  "/",
  [
    check("fecha", "La fecha de la situacion de la visita es obligatoria")
      .not()
      .isEmpty(),
    check("nombreFeligres", "El nombre del feligres es obligatorio")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearSituacionVisita
);
router.put("/:id", validarJWT, actualizarSituacionVisita);

export default router;
