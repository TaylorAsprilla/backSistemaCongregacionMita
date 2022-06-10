/* 
  Path: '/api/logro'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarLogro,
  crearLogro,
  getLogros,
} from "../controllers/logro.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getLogros);
router.post(
  "/",
  [
    check("logro", "El logro es obligatorio").not().isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearLogro
);
router.put("/:id", validarJWT, actualizarLogro);

export default router;
