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

const router = Router();

router.get(
  "/informe/logros",
  validarJWT,
  cargarInformeIdDesdeQuery,
  getLogrosPorInforme,
);
router.get("/informe/:informeId", validarJWT, getLogrosPorInforme);
router.get("/", validarJWT, getLogros);
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
  crearLogro,
);
router.put("/:id", validarJWT, actualizarLogro);
router.delete("/:id", validarJWT, eliminarLogro);

export default router;
