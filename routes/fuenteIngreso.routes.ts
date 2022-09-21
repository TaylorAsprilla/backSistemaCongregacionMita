/* 
  Path: '/api/fuenteIngreso'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarfuenteIngreso,
  actualizarFuenteIngreso,
  crearFuenteIngreso,
  eliminarFuenteIngreso,
  getFuenteIngresos,
  getUnFuenteIngreso,
} from "../controllers/fuenteIngreso.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getFuenteIngresos);
router.get("/:id", validarJWT, getUnFuenteIngreso);
router.post(
  "/",
  [
    check("fuenteIngreso", "La fuente de ingresos es obligatorio")
      .not()
      .isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearFuenteIngreso
);
router.put(
  "/:id",
  [
    check("fuenteIngreso", "La fuente de ingresos es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarFuenteIngreso
);
router.delete("/:id", validarJWT, eliminarFuenteIngreso);
router.put("/activar/:id", validarJWT, activarfuenteIngreso);

export default router;
