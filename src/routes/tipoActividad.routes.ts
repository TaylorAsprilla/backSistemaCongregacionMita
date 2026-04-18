/* 
  Path: '/api/tipoActividad'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  crearTipoActividad,
  eliminarTipoActividad,
  getTipoActividad,
  actualizarTipoActividad,
} from "../controllers/tipoActividad.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoActividad);
router.post(
  "/",
  [
    check("nombre", "El nombre de la actividad es obligatorio ")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearTipoActividad,
);
router.put(
  "/:id",
  [
    check("nombre", "El nombre de la actividad es obligatorio ")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoActividad,
);
router.delete("/:id", validarJWT, eliminarTipoActividad);

export default router;
