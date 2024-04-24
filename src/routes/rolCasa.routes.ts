/* 
  Path: '/api/rolcasa'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarRolCasa,
  actualizarRolCasa,
  crearRolCasa,
  eliminarRolCasa,
  getRolCasa,
} from "../controllers/rolCasa.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getRolCasa);
router.post(
  "/",
  [
    check("rolCasa", "El nombre es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearRolCasa
);
router.put(
  "/:id",
  [
    check("rolCasa", "El nombre es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarRolCasa
);

router.put("/activar/:id", validarJWT, activarRolCasa);
router.delete("/:id", validarJWT, eliminarRolCasa);

export default router;
