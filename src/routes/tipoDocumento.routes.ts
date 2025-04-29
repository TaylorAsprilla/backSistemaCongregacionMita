/* 
  Path: '/api/tipodocumento'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarTipoDeDocumento,
  actualizarTipoDocumento,
  crearTipoDocumento,
  eliminarTipoDocumento,
  getTipoDocumento,
  getUnTipoDocumento,
} from "../controllers/tipoDocumento.controller";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoDocumento);
router.get("/:id", validarJWT, getUnTipoDocumento);
router.post(
  "/",
  [
    check("documento", "El nombre del documento es obligatorio ")
      .not()
      .isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearTipoDocumento
);
router.put(
  "/:id",
  [
    check("documento", "El nombre del documento es obligatorio ")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoDocumento
);
router.delete("/:id", validarJWT, eliminarTipoDocumento);
router.put("/activar/:id", validarJWT, activarTipoDeDocumento);

export default router;
