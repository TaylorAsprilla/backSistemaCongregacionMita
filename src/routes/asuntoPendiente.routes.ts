/* 
  Path: '/api/asuntopendiente'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarAsuntoPendiente,
  crearAsuntoPendiente,
  getAsuntoPendientes,
} from "../controllers/asuntoPendiente.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getAsuntoPendientes);
router.post(
  "/",
  [
    check("asunto", "El asunto es obligatorio").not().isEmpty(),
    check("responsable", "Debe relacionar el responsable del asunto pendiente")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearAsuntoPendiente
);
router.put("/:id", validarJWT, actualizarAsuntoPendiente);

export default router;
