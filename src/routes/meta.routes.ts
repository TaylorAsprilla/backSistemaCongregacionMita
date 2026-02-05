/* 
  Path: '/api/meta'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarMeta,
  crearMeta,
  eliminarMeta,
  getMeta,
  getMetas,
} from "../controllers/meta.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getMetas);
router.get("/:id", validarJWT, getMeta);
router.post(
  "/",
  [
    check("meta", "Debe describir la meta").not().isEmpty(),
    check("fecha", "La fecha de la meta es obligatoria").not().isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    check("tipoStatus_id", "Debe selecionar el tipo de status").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearMeta,
);
router.put("/:id", validarJWT, actualizarMeta);
router.delete("/:id", validarJWT, eliminarMeta);

export default router;
