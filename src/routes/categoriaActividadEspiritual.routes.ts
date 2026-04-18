/* 
  Path: '/api/categoriaActividadEspiritual'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  getCategoriaActividadEspiritual,
  crearCategoriaActividadEspiritual,
  actualizarCategoriaActividadEspiritual,
  eliminarCategoriaActividadEspiritual,
} from "../controllers/categoriaActividadEspiritual.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getCategoriaActividadEspiritual);

router.post(
  "/",
  [
    check("nombre", "El nombre de la categoría es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearCategoriaActividadEspiritual,
);

router.put(
  "/:id",
  [
    check("nombre", "El nombre de la categoría es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarCategoriaActividadEspiritual,
);

router.delete("/:id", validarJWT, eliminarCategoriaActividadEspiritual);

export default router;
