import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarRolCasa,
  crearRolCasa,
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

export default router;
