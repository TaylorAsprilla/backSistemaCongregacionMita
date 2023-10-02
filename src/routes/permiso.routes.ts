/* 
  Path: '/api/permiso'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarPermiso,
  crearPermiso,
  eliminarPermiso,
  getPermisos,
  getPermisoUsuario,
  getUnPermiso,
} from "../controllers/permiso.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getPermisos);
router.get("/:id", validarJWT, getUnPermiso);
router.get("/usuario/:id", validarJWT, getPermisoUsuario);
router.post(
  "/",
  [
    check("permiso", "El permiso es obligatorio ").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearPermiso
);
router.put(
  "/:id",
  [
    check("permiso", "El permiso es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarPermiso
);
router.put("/activar/:id", [validarCampos, validarJWT], actualizarPermiso);
router.delete("/:id", validarJWT, eliminarPermiso);

export default router;
