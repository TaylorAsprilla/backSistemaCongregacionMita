/* 
  Path: '/api/informe'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarInforme,
  cerrarInforme,
  crearInforme,
  eliminarInforme,
  getInforme,
  getAuditoriaInforme,
  getInformes,
  getMisInformes,
  getMisResponsabilidades,
  getInformesPorTrimestreYPais,
  getResumenInforme,
  verificarInformeAbierto,
} from "../controllers/informe.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getInformes);
router.get("/mios", validarJWT, getMisInformes);
router.get("/responsabilidades", validarJWT, getMisResponsabilidades);
router.get("/verificar-abierto", validarJWT, verificarInformeAbierto);
router.get("/resumen", validarJWT, getResumenInforme);
router.get("/trimestre-pais", validarJWT, getInformesPorTrimestreYPais);
router.get("/:id/auditoria", validarJWT, getAuditoriaInforme);
router.get("/:id", validarJWT, getInforme);
router.post(
  "/",
  [
    check("tipo_congregacion", "El tipo_congregacion es obligatorio y debe ser válido")
      .isIn(["PAIS", "CONGREGACION", "CAMPO"]),
    check("congregacion_id", "El congregacion_id es obligatorio y debe ser numérico")
      .isInt({ min: 1 }),
    validarCampos,
    validarJWT,
  ],
  crearInforme,
);
router.post("/:id/cerrar", validarJWT, cerrarInforme);
router.put(
  "/:id",
  [
    check("estado", "El estado del informe es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarInforme,
);
router.delete("/:id", validarJWT, eliminarInforme);

export default router;
