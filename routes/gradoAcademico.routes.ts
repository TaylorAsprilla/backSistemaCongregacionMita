/* 
  Path: '/api/gradoAcademico'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarGradoAcademico,
  actualizarGradoAcademico,
  crearGradoAcademico,
  eliminarGradoAcademico,
  getGradoAcademico,
  getUnGradoAcademico,
} from "../controllers/gradoAcademico.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getGradoAcademico);
router.get("/:id", validarJWT, getUnGradoAcademico);
router.post(
  "/",
  [
    check("gradoAcademico", "El grado académico es obligatorio")
      .not()
      .isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearGradoAcademico
);
router.put(
  "/:id",
  [
    check("gradoAcademico", "El grado académico es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarGradoAcademico
);
router.delete("/:id", validarJWT, eliminarGradoAcademico);
router.put("/activar/:id", validarJWT, activarGradoAcademico);

export default router;
