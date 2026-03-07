/* 
  Path: '/api/categorias-profesion'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarCategoriaProfesion,
  actualizarCategoriaProfesion,
  crearCategoriaProfesion,
  eliminarCategoriaProfesion,
  getCategoriaProfesion,
  getCategoriasProfesion,
} from "../controllers/categoriaProfesion.controller";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getCategoriasProfesion);
router.get("/:id", validarJWT, getCategoriaProfesion);

router.post(
  "/",
  [
    validarJWT,
    check("nombre", "El nombre de la categoría es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  crearCategoriaProfesion,
);

router.put(
  "/:id",
  [
    validarJWT,
    check("nombre", "El nombre de la categoría es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  actualizarCategoriaProfesion,
);

router.delete("/:id", validarJWT, eliminarCategoriaProfesion);
router.put("/activar/:id", validarJWT, activarCategoriaProfesion);

export default router;
