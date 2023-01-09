/* 
  Path: '/api/parentesco'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarParentesco,
  actualizarParentesco,
  crearParentesco,
  eliminarParentesco,
  getParentesco,
  getUnParentesco,
} from "../controllers/parentesco.controllers";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getParentesco);
router.get("/:id", validarJWT, getUnParentesco);
router.post(
  "/",
  [
    check("nombre", "El nombre del parentesco es obligatorio").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearParentesco
);
router.put(
  "/:id",
  [
    check("nombre", "El nombre del parentesco es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarParentesco
);
router.delete("/:id", validarJWT, eliminarParentesco);
router.put("/activar/:id", validarJWT, activarParentesco);

export default router;
