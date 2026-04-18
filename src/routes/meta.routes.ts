/* 
  Path: '/api/meta'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarMeta,
  crearMeta,
  eliminarMeta,
  getMeta,
  getMetas,
  getMetasPorInforme,
  getMetasPendientesPorUsuario,
  copiarMetaANuevoInforme,
  marcarMetaComoCumplida,
} from "../controllers/meta.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getMetas);
router.get("/:id", validarJWT, getMeta);

// Nuevas rutas para seguimiento de metas
router.get("/informe/:informeId", validarJWT, getMetasPorInforme);
router.get(
  "/pendientes/usuario/:usuarioId",
  validarJWT,
  getMetasPendientesPorUsuario,
);

router.post(
  "/",
  [
    check("meta", "Debe describir la meta").not().isEmpty(),
    check("fecha", "La fecha de la meta es obligatoria").not().isEmpty(),
    check("informe_id", "Debe selecionar el informe de la actividad")
      .not()
      .isEmpty(),
    check("tipoStatus_id", "Debe selecionar el tipo de status").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearMeta,
);

router.post(
  "/copiar",
  [
    check(
      "meta_id_original",
      "El ID de la meta original es obligatorio",
    ).isNumeric(),
    check(
      "nuevo_informe_id",
      "El ID del nuevo informe es obligatorio",
    ).isNumeric(),
    validarCampos,
    validarJWT,
  ],
  copiarMetaANuevoInforme,
);

router.put("/:id", validarJWT, actualizarMeta);

router.put("/:id/cumplir", validarJWT, marcarMetaComoCumplida);

router.delete("/:id", validarJWT, eliminarMeta);

export default router;
