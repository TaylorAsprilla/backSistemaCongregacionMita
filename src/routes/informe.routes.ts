/* 
  Path: '/api/informe'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  actualizarInforme,
  crearInforme,
  eliminarInforme,
  getInforme,
  getInformes,
  getInformesPorTrimestreYPais,
  verificarInformeAbierto,
} from "../controllers/informe.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getInformes);
router.get("/verificar-abierto", validarJWT, verificarInformeAbierto);
router.get("/trimestre-pais", validarJWT, getInformesPorTrimestreYPais);
router.get("/:id", validarJWT, getInforme);
router.post(
  "/",
  [
    check("usuario_id", "El usuario_id es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearInforme,
);
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
