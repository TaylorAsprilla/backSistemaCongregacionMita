/* 
  Path: '/api/tipoActividad'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  crearTipoActividad,
  eliminarTipoActividad,
  getTipoActividad,
} from "../controllers/tipoActividad.controllers";

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
    check("idSeccion", "El id de la seción es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearTipoActividad
);
router.delete("/:id", validarJWT, eliminarTipoActividad);

export default router;
