/* 
  Path: '/api/actividadEconomica'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarActividadEconomica,
  crearActividadEconomica,
  getActividadEconomica,
  getActividadEconomicaPorInforme,
  getUnaActividadEconomica,
  eliminarActividadEconomica,
} from "../controllers/actividadEconomica.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { cargarInformeIdDesdeQuery } from "../helpers/informe-autorizado";

const router = Router();

router.get(
  "/informe/actividades-economicas",
  validarJWT,
  cargarInformeIdDesdeQuery,
  getActividadEconomicaPorInforme,
);
router.get("/informe/:informeId", validarJWT, getActividadEconomicaPorInforme);
router.get("/", validarJWT, getActividadEconomica);

router.get("/:id", validarJWT, getUnaActividadEconomica);

router.post(
  "/",
  [
    check("fecha", "La fecha de la actividad económica es obligatoria")
      .not()
      .isEmpty(),
    check(
      "asistencia",
      "La asistencia de la actividad económica es obligatoria",
    )
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    check(
      "tipoActividadEconomica_id",
      "Debe selecionar el tipo de actividad económica",
    )
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearActividadEconomica,
);

router.put("/:id", validarJWT, actualizarActividadEconomica);

router.delete("/:id", validarJWT, eliminarActividadEconomica);

export default router;
