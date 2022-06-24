/* 
  Path: '/api/pais'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarPais,
  crearPais,
  getPais,
} from "../controllers/pais.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getPais);
router.post(
  "/",
  [
    check("pais", "El nombre del pais es obligatorio ").not().isEmpty(),
    check("idDivisa", "La divisa del pais es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearPais
);
router.put("/:id", validarJWT, actualizarPais);

export default router;
