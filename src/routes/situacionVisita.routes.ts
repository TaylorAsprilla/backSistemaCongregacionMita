/* 
  Path: '/api/situacionvisita'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarSituacionVisita,
  crearSituacionVisita,
  eliminarSituacionVisita,
  getSituacionVisita,
  getSituacionVisitaPorInforme,
} from "../controllers/situacionVisita.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { cargarInformeIdDesdeQuery } from "../helpers/informe-autorizado";
import bloquearLecturaGlobalInforme from "../middlewares/bloquear-lectura-global-informe";
import SituacionVisita from "../models/situacionVisita.model";
import {
  bloquearInformeCerradoEnCreacion,
  bloquearInformeCerradoEnEdicion,
} from "../middlewares/bloquear-informe-cerrado";

const router = Router();

router.get(
  "/informe/situaciones-visita",
  validarJWT,
  cargarInformeIdDesdeQuery,
  getSituacionVisitaPorInforme,
);
router.get("/informe/:informeId", validarJWT, getSituacionVisitaPorInforme);
router.get("/", validarJWT, bloquearLecturaGlobalInforme, getSituacionVisita);
router.post(
  "/",
  [
    check("fecha", "La fecha de la situacion de la visita es obligatoria")
      .not()
      .isEmpty(),
    check("nombreFeligres", "El nombre del feligres es obligatorio")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  bloquearInformeCerradoEnCreacion(),
  crearSituacionVisita,
);
router.put(
  "/:id",
  validarJWT,
  bloquearInformeCerradoEnEdicion(SituacionVisita),
  actualizarSituacionVisita,
);
router.delete(
  "/:id",
  validarJWT,
  bloquearInformeCerradoEnEdicion(SituacionVisita),
  eliminarSituacionVisita,
);

export default router;
