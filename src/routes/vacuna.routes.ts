/* 
  Path: '/api/vacuna'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarVacuna,
  crearVacuna,
  getVacuna,
} from "../controllers/vacuna.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getVacuna);
router.post(
  "/",
  [
    check("vacuna", "El nombre de la vavuna obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearVacuna
);
router.put("/:id", validarJWT, actualizarVacuna);

export default router;
