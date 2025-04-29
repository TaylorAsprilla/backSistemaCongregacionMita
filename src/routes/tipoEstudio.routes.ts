/* 
  Path: '/api/tipoestudio'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarTipoEstudio,
  actualizarTipoEstudio,
  crearTipoEstudio,
  eliminarTipoEstudio,
  getTipoEstudio,
  getUnTipoEstudio,
} from "../controllers/tipoEstudio.controller";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoEstudio);
router.get("/:id", validarJWT, getUnTipoEstudio);
router.post(
  "/",
  [
    check("estudio", "El tipo de estudio es obligatorio ").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearTipoEstudio
);
router.put(
  "/:id",
  [
    check("estudio", "El tipo de estudio es obligatorio ").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoEstudio
);
router.delete("/:id", validarJWT, eliminarTipoEstudio);
router.put("/activar/:id", validarJWT, activarTipoEstudio);

export default router;
