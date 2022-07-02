import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarEstadoCivil,
  crearEstadoCivil,
  getEstadoCivil,
} from "../controllers/estadoCivil.controllers";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getEstadoCivil);
router.post(
  "/",
  [
    check("estadoCivil", "El nombre es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearEstadoCivil
);
router.put(
  "/:id",
  [
    check("estadoCivil", "El nombre es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarEstadoCivil
);

export default router;
