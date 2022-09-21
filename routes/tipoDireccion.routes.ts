/* 
  Path: '/api/tipoDireccion'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarTipoDireccion,
  actualizarTipoDireccion,
  crearTipoDireccion,
  eliminarTipoDireccion,
  getTipoDirecciones,
  getUnTipoDireccion,
} from "../controllers/tipoDireccion.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoDirecciones);
router.get("/:id", validarJWT, getUnTipoDireccion);
router.post(
  "/",
  [
    check("tipoDireccion", "El tipo de la dirección es obligatorio")
      .not()
      .isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearTipoDireccion
);
router.put(
  "/:id",
  [
    check("tipoDireccion", "El tipo de la dirección es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoDireccion
);
router.delete("/:id", validarJWT, eliminarTipoDireccion);
router.put("/activar/:id", validarJWT, activarTipoDireccion);

export default router;
