/* 
  Path: '/api/campo'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarCampo,
  crearCampo,
  getCampo,
  getCampos,
} from "../controllers/campo.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getCampos);
router.get("/:id", validarJWT, getCampo);
router.post(
  "/",
  [
    check("campo", "El nombre del campo es obligatorio").not().isEmpty(),
    check(
      "congregacion_id",
      "La congregación al cual pertenece el campo es obligatorio"
    )
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearCampo
);
router.put("/:id", validarJWT, actualizarCampo);

export default router;
