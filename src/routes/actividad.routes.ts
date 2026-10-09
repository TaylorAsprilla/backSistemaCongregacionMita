/* 
  Path: '/api/actividad'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarActividad,
  crearActividad,
  getActividad,
  getActividadPorInforme,
} from "../controllers/actividad.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { cargarInformeIdDesdeQuery } from "../helpers/informe-autorizado";
import bloquearLecturaGlobalInforme from "../middlewares/bloquear-lectura-global-informe";
import Actividad from "../models/actividad.model";
import {
  bloquearInformeCerradoEnCreacion,
  bloquearInformeCerradoEnEdicion,
} from "../middlewares/bloquear-informe-cerrado";

const router = Router();

router.get(
  "/informe/actividades",
  validarJWT,
  cargarInformeIdDesdeQuery,
  getActividadPorInforme,
);
router.get("/informe/:informeId", validarJWT, getActividadPorInforme);
router.get("/", validarJWT, bloquearLecturaGlobalInforme, getActividad);
router.post(
  "/",
  [
    check("fecha", "La fecha de la actividad es obligatoria ").not().isEmpty(),
    check("asistencia", "La asistencia de la actividad es obligatoria")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    check("tipoActividad_id", "Debe selecionar el tipo de actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  bloquearInformeCerradoEnCreacion(),
  crearActividad,
);
router.put(
  "/:id",
  validarJWT,
  bloquearInformeCerradoEnEdicion(Actividad),
  actualizarActividad,
);

export default router;
