/* 
  Path: '/api/informe'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarInforme,
  crearInforme,
  eliminarInforme,
  getInforme,
  getInformes,
} from "../controllers/informe.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getInformes);
router.get("/:id", validarJWT, getInforme);
router.post(
  "/",
  [
    check("fecha", "La fecha del informe es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearInforme
);
router.put(
  "/:id",
  [
    check("estado", "El estado del informe es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarInforme
);
router.delete("/:id", validarJWT, eliminarInforme);

export default router;
