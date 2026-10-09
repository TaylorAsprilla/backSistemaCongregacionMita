/* 
  Path: '/api/logro'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarLogro,
  crearLogro,
  eliminarLogro,
  getLogros,
  getLogrosPorInforme,
} from "../controllers/logro.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { cargarInformeIdDesdeQuery } from "../helpers/informe-autorizado";
import bloquearLecturaGlobalInforme from "../middlewares/bloquear-lectura-global-informe";
import Logro from "../models/logro.model";
import {
  bloquearInformeCerradoEnCreacion,
  bloquearInformeCerradoEnEdicion,
} from "../middlewares/bloquear-informe-cerrado";

const router = Router();

router.get(
  "/informe/logros",
  validarJWT,
  cargarInformeIdDesdeQuery,
  getLogrosPorInforme,
);
router.get("/informe/:informeId", validarJWT, getLogrosPorInforme);
router.get("/", validarJWT, bloquearLecturaGlobalInforme, getLogros);
router.post(
  "/",
  [
    check("logro", "El logro es obligatorio").not().isEmpty(),
    check("responsable", "Debe escribir la persona responsable")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  bloquearInformeCerradoEnCreacion(),
  crearLogro,
);
router.put("/:id", validarJWT, bloquearInformeCerradoEnEdicion(Logro), actualizarLogro);
router.delete("/:id", validarJWT, bloquearInformeCerradoEnEdicion(Logro), eliminarLogro);

export default router;
