/* 
  Path: '/api/genero'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarGenero,
  actualizarGenero,
  crearGenero,
  eliminarGenero,
  getGenero,
} from "../controllers/genero.controller";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getGenero);
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
router.put("/activar/:id", validarJWT, activarGenero);

export default router;
