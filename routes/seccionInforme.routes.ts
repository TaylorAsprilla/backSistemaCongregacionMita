/* 
  Path: '/api/seccioninforme'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarSeccionInforme,
  actualizarSeccionInforme,
  crearSeccionInforme,
  eliminarSeccionInforme,
  getSeccionesInformes,
  getSeccionInforme,
} from "../controllers/seccionInforme.controllers";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getSeccionesInformes);
router.get("/:id", validarJWT, getSeccionInforme);
router.post(
  "/",
  [
    check("seccion", "El nombre de la sección es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearSeccionInforme
);
router.put("/:id", validarJWT, actualizarSeccionInforme);
router.put("/activar/:id", validarJWT, activarSeccionInforme);
router.delete("/:id", validarJWT, eliminarSeccionInforme);

export default router;
