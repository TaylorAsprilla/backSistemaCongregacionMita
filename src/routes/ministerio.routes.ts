/* 
  Path: '/api/ministerio'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarMinisterio,
  actualizarMinisterio,
  crearMinisterio,
  eliminarMinisterio,
  getMinisterio,
  getUnMinisterio,
} from "../controllers/ministerio.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getMinisterio);
router.get("/:id", validarJWT, getUnMinisterio);
router.post(
  "/",
  [
    check("ministerio", "El ministerio es obligatorio ").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearMinisterio
);
router.put(
  "/:id",
  [
    check("ministerio", "El ministerio es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarMinisterio
);
router.delete("/:id", validarJWT, eliminarMinisterio);
router.put("/activar/:id", validarJWT, activarMinisterio);

export default router;
