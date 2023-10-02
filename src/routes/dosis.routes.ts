/* 
  Path: '/api/dosis'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarDosis,
  crearDosis,
  getDosis,
} from "../controllers/dosis.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getDosis);
router.post(
  "/",
  [
    check("dosis", "El nombre de la dosis es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearDosis
);
router.put("/:id", validarJWT, actualizarDosis);

export default router;
