/* 
  Path: '/api/tipoActividadEconomica'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  crearTipoActividadEconomica,
  eliminarTipoActividadEconomica,
  getTipoActividadEconomica,
  actualizarTipoActividadEconomica,
} from "../controllers/tipoActividadEconomica.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoActividadEconomica);

router.post(
  "/",
  [
    check("nombre", "El nombre de la actividad económica es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearTipoActividadEconomica,
);

router.put(
  "/:id",
  [
    check("nombre", "El nombre de la actividad económica es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoActividadEconomica,
);

router.delete("/:id", validarJWT, eliminarTipoActividadEconomica);

export default router;
