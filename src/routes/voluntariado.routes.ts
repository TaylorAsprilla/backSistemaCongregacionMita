/* 
  Path: '/api/voluntariado'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarVoluntariado,
  actualizarVoluntariado,
  crearVoluntariado,
  eliminarVoluntariado,
  getUnVoluntariado,
  getVoluntariados,
} from "../controllers/voluntariado.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getVoluntariados);
router.get("/:id", validarJWT, getUnVoluntariado);
router.post(
  "/",
  [
    check("nombreVoluntariado", "El nombre del voluntariado es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearVoluntariado
);
router.put(
  "/:id",
  [
    check("nombreVoluntariado", "El nombre del voluntariado es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarVoluntariado
);
router.delete("/:id", validarJWT, eliminarVoluntariado);
router.put("/activar/:id", validarJWT, activarVoluntariado);

export default router;
