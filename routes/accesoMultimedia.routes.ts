/* 
  Path: '/api/accesomultimedia'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarAccesoMultimedia,
  actualizarAccesoMultimedia,
  crearAccesoMultimedia,
  eliminarAccesoMultimedia,
} from "../controllers/accesoMultimedia.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.post(
  "/",
  [
    check("login", "Diligencia el Login del usuario ").not().isEmpty(),
    check("password", "Diligencia la contraseña del usuario").not().isEmpty(),
    check("solicitud_id", "El ID de la solicitud es obligatorio")
      .not()
      .isEmpty(),
    check("tiempoAprobacion", "Selecciona el tiempo de aprobación")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearAccesoMultimedia
);

router.put("/:id", validarJWT, actualizarAccesoMultimedia);
router.put("/activar/:id", validarJWT, activarAccesoMultimedia);
router.delete("/:id", validarJWT, eliminarAccesoMultimedia);

export default router;
