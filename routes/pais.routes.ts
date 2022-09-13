/* 
  Path: '/api/pais'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarPais,
  actualizarPais,
  crearPais,
  eliminarPais,
  getPais,
  getPaises,
} from "../controllers/pais.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getPaises);
router.get("/:id", validarJWT, getPais);
router.post(
  "/",
  [
    check("pais", "El nombre del pais es obligatorio ").not().isEmpty(),
    check("idDivisa", "La divisa del pais es obligatorio").not().isEmpty(),
    check("idObreroEncargado", "Debe seleccionar un obrero encargado")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearPais
);
router.put("/:id", validarJWT, actualizarPais);
router.put("/activar/:id", validarJWT, activarPais);
router.delete("/:id", validarJWT, eliminarPais);

export default router;
