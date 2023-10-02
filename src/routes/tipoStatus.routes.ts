/* 
  Path: '/api/tipostatus'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarTipoStatus,
  crearTipostatus,
  eliminarTipoStatus,
  getTipostatus,
} from "../controllers/tipoStatus.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipostatus);
router.post(
  "/",
  [
    check("status", "El nombre del status es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearTipostatus
);
router.put("/:id", validarJWT, actualizarTipoStatus);
router.delete("/:id", validarJWT, eliminarTipoStatus);

export default router;
