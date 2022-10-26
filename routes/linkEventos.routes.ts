/* 
  Path: '/api/evento'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  crearLinkEvento,
  getLinkEventos,
} from "../controllers/linkEvento.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getLinkEventos);
router.post(
  "/",
  [
    check("link", "El link es obligatorio").not().isEmpty(),
    check("tipoEvento_id", "El tipo de evento es obligatorio").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearLinkEvento
);

export default router;
