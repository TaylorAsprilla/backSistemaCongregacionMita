/* 
  Path: '/api/permiso'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarPermiso,
  crearPermiso,
  eliminarPermiso,
  getPermiso,
  getUnPermiso,
} from "../controllers/permiso.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getPermiso);
router.get("/:id", validarJWT, getUnPermiso);
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
router.delete("/:id", validarJWT, eliminarPermiso);

export default router;
