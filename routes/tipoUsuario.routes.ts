/* 
  Path: '/api/tipousuario'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarTipoUsuario,
  crearTipoUsuario,
  eliminarTipoUsuario,
  getTipoUsuario,
  getUnTipoUsuario,
} from "../controllers/tipoUsuario.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoUsuario);
router.get("/:id", validarJWT, getUnTipoUsuario);
router.post(
  "/",
  [
    check("tipo", "El tipo de usuario es obligatorio ").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearTipoUsuario
);
router.put(
  "/:id",
  [
    check("tipo", "El tipo de usuario es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoUsuario
);
router.delete("/:id", validarJWT, eliminarTipoUsuario);

export default router;
