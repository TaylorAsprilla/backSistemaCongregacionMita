/* 
  Path: '/api/congregacion'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarCongregacion,
  actualizarCongregacion,
  crearCongregacion,
  eliminarCongregacion,
  getCongregacion,
  getCongregaciones,
} from "../controllers/congregacion.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getCongregaciones);
router.get("/:id", validarJWT, getCongregacion);
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
router.put("/activar/:id", validarJWT, activarCongregacion);
router.delete("/:id", validarJWT, eliminarCongregacion);

export default router;
