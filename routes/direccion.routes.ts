/* 
  Path: '/api/direccion'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarDireccion,
  crearDireccion,
  getDireccion,
  getDirecciones,
} from "../controllers/direccion.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getDirecciones);
router.get("/:id", validarJWT, getDireccion);
router.post(
  "/",
  [
    check("direccion", "La dirección es obligatoria").not().isEmpty(),
    check("ciudad", "Ingrese la ciudad correspondiente a la dirección")
      .not()
      .isEmpty(),
    check("tipoDireccion_id", "Seleccione el tipo de dirección")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearDireccion
);
router.put("/:id", validarJWT, actualizarDireccion);

export default router;
