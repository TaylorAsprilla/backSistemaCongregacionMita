/* 
  Path: '/api/contabilidad'
*/

import { Router } from "express";
import { check } from "express-validator";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { cargarInformeIdDesdeQuery } from "../helpers/informe-autorizado";
import {
  actualizarDiezmo,
  crearDiezmo,
  getDiezmos,
  getDiezmosPorInforme,
  getUnDiezmo,
} from "../controllers/diezmoscontroller";

const router = Router();

router.get(
  "/informe/diezmos",
  validarJWT,
  cargarInformeIdDesdeQuery,
  getDiezmosPorInforme,
);
router.get("/informe/:informeId", validarJWT, getDiezmosPorInforme);
router.get("/", validarJWT, getDiezmos);
router.get("/:id", validarJWT, getUnDiezmo);
router.post(
  "/",
  [
    check(
      "sobresRestrictos",
      "La cantidad de sobres restrictos es obligatorio ",
    )
      .not()
      .isEmpty(),
    check(
      "sobresNoRestrictos",
      "La cantidad de sobres no restrictos es obligatorio ",
    )
      .not()
      .isEmpty(),
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
  crearDiezmo,
);
router.put("/:id", validarJWT, actualizarDiezmo);

export default router;
