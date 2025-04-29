/* 
  Path: '/api/razonsolicitud'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarRazonSolicitud,
  actualizarRazonSolicitud,
  crearUnaRazonSolicitud,
  eliminarRazonSolicitud,
  getRazonSolitudes,
} from "../controllers/razonSolicitud.controller";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", getRazonSolitudes);
router.post(
  "/",
  [
    check("solicitud", "El nombre es obligatorio").not().isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearUnaRazonSolicitud
);
router.put("/:id", validarJWT, actualizarRazonSolicitud);
router.delete("/:id", validarJWT, eliminarRazonSolicitud);
router.put("/activar/:id", validarJWT, activarRazonSolicitud);

export default router;
