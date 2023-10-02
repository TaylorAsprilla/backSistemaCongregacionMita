/* 
  Path: '/api/divisa'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarDivisa,
  crearDivisa,
  getDivisa,
} from "../controllers/divisa.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getDivisa);
router.post(
  "/",
  [
    check("divisa", "El nombre de la divisa es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearDivisa
);
router.put("/:id", validarJWT, actualizarDivisa);

export default router;
