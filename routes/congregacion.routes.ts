/* 
  Path: '/api/congregacion'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarCongregacion,
  crearCongregacion,
  getCongregacion,
} from "../controllers/congregacion.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getCongregacion);
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
  crearCongregacion
);
router.put("/:id", validarJWT, actualizarCongregacion);

export default router;
