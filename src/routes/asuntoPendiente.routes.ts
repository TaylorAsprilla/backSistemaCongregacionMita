/* 
  Path: '/api/asunto-pendiente'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  getAsuntosPendientes,
  getAsuntoPendiente,
  getAsuntosPorInforme,
  getAsuntosPendientesPorUsuario,
  crearAsuntoPendiente,
  actualizarAsuntoPendiente,
  copiarAsuntoANuevoInforme,
  eliminarAsuntoPendiente,
} from "../controllers/asuntoPendiente.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { cargarInformeIdDesdeQuery } from "../helpers/informe-autorizado";
import { TIPO_ASUNTO_PENDIENTE_ENUM } from "../enum/asuntoPendiente.enum";
import bloquearLecturaGlobalInforme from "../middlewares/bloquear-lectura-global-informe";
import AsuntoPendiente from "../models/asuntoPendiente.model";
import {
  bloquearInformeCerradoEnCreacion,
  bloquearInformeCerradoEnEdicion,
} from "../middlewares/bloquear-informe-cerrado";

const router = Router();

router.get("/", validarJWT, bloquearLecturaGlobalInforme, getAsuntosPendientes);
router.get("/:id", validarJWT, bloquearLecturaGlobalInforme, getAsuntoPendiente);

// Rutas para seguimiento de asuntos pendientes
router.get(
  "/informe/asuntos-pendientes",
  validarJWT,
  cargarInformeIdDesdeQuery,
  getAsuntosPorInforme,
);
router.get("/informe/:informeId", validarJWT, getAsuntosPorInforme);
router.get(
  "/pendientes/usuario/:usuarioId",
  validarJWT,
  bloquearLecturaGlobalInforme,
  getAsuntosPendientesPorUsuario,
);

router.post(
  "/",
  [
    check("asunto", "El asunto es obligatorio").not().isEmpty(),
    check("tipoAsunto", "El tipo de asunto es obligatorio").not().isEmpty(),
    check("tipoAsunto", "El tipo de asunto no es valido").isIn(
      Object.values(TIPO_ASUNTO_PENDIENTE_ENUM),
    ),
    check("informe_id", "El ID del informe es obligatorio").isNumeric(),
    validarCampos,
    validarJWT,
  ],
  bloquearInformeCerradoEnCreacion(),
  crearAsuntoPendiente,
);

router.post(
  "/copiar",
  [
    check(
      "asunto_id_original",
      "El ID del asunto original es obligatorio",
    ).isNumeric(),
    check(
      "nuevo_informe_id",
      "El ID del nuevo informe es obligatorio",
    ).isNumeric(),
    validarCampos,
    validarJWT,
  ],
  bloquearInformeCerradoEnCreacion("nuevo_informe_id"),
  copiarAsuntoANuevoInforme,
);

router.put(
  "/:id",
  [
    check("tipoAsunto", "El tipo de asunto no es valido")
      .optional()
      .isIn(Object.values(TIPO_ASUNTO_PENDIENTE_ENUM)),
    validarCampos,
    validarJWT,
  ],
  bloquearInformeCerradoEnEdicion(AsuntoPendiente),
  actualizarAsuntoPendiente,
);

router.delete(
  "/:id",
  validarJWT,
  bloquearInformeCerradoEnEdicion(AsuntoPendiente),
  eliminarAsuntoPendiente,
);

export default router;
