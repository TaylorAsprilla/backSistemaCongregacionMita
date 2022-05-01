/* 
  Path: '/api/genero'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarGenero,
  crearGenero,
  eliminarGenero,
  getGenero,
} from "../controllers/genero.controllers";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/:id", validarJWT, getGenero);
router.post(
  "/",
  [
    check("genero", "El nombre es obligatorio ").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearGenero
);
router.put(
  "/:id",
  [
    check("genero", "El nombre del documento es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarGenero
);
router.delete("/:id", validarJWT, eliminarGenero);

export default router;
