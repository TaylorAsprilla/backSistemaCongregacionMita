/* 
  Path: '/api/tipoempleo'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarTipoEmpleo,
  actualizarTipoEmpleo,
  crearTipoEmpleo,
  eliminarTipoEmpleo,
  getTipoEmpleo,
  getUnTipoEmpleo,
} from "../controllers/tipoEmpleo.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getTipoEmpleo);
router.get("/:id", validarJWT, getUnTipoEmpleo);
router.post(
  "/",
  [
    check("nombreEmpleo", "El nombre del empleo es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearTipoEmpleo
);
router.put(
  "/:id",
  [
    check("nombreEmpleo", "El nombre del empleo es obligatorio")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizarTipoEmpleo
);
router.delete("/:id", validarJWT, eliminarTipoEmpleo);
router.put("/activar/:id", validarJWT, activarTipoEmpleo);

export default router;
