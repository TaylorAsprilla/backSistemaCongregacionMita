/* 
  Path: '/api/contabilidad'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarContabilidad,
  crearContabilidad,
  getContabilidad,
  getUnaContabilidad,
} from "../controllers/contabilidad.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getContabilidad);
router.get("/:id", validarJWT, getUnaContabilidad);
router.post(
  "/",
  [
    check("sobres", "La cantidad de sobres es obligatorio ").not().isEmpty(),
    check("restrictos", "La cantidad de diezmos restrictos es obligatorio")
      .not()
      .isEmpty(),
    check("noRestrictos", "La cantidad de diezmos no restrictos es obligatorio")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el id del informe").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearContabilidad
);
router.put("/:id", validarJWT, actualizarContabilidad);

export default router;
