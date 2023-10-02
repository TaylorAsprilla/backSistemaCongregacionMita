/* 
  Path: '/api/tipomiembro'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarTipoMiembro,
  actualizarTipoMiembro,
  crearTipoMiembro,
  eliminarTipoMiembro,
  getTipoMiembro,
  getUnTipoMiembro,
} from "../controllers/tipoMiembro.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoMiembro);
router.get("/:id", validarJWT, getUnTipoMiembro);
router.post(
  "/",
  [
    check("miembro", "El nombre del tipo de miembro es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearTipoMiembro
);
router.put(
  "/:id",
  [
    check("miembro", "El nombre del tipo de miembro es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoMiembro
);
router.delete("/:id", validarJWT, eliminarTipoMiembro);
router.put("/activar/:id", validarJWT, activarTipoMiembro);

export default router;
