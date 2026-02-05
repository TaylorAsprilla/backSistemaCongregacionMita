/* 
  Path: '/api/visita'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarVisita,
  crearVisita,
  eliminarVisita,
  getUnaVisita,
  getVisitas,
} from "../controllers/visita.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getVisitas);
router.get("/:id", validarJWT, getUnaVisita);
router.post(
  "/",
  [
    check("mes", "El mes de la visita es obligatorio").not().isEmpty(),
    check("referidasOots", "Las situaciones referidas a OOTS es obligatorio")
      .not()
      .isEmpty(),
    check("visitasHogares", "El número de visitas a hogares es obligatorio")
      .not()
      .isEmpty(),
    check("visitaHospital", "El número de visitas a hospitales es obligatorio")
      .not()
      .isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearVisita,
);
router.put("/:id", validarJWT, actualizarVisita);
router.delete("/:id", validarJWT, eliminarVisita);

export default router;
