/* 
  Path: '/api/solicitudmultimedia'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarSolicitudMultimedia,
  actualizarSolicitudMultimedia,
  buscarCorreoElectronico,
  crearSolicitudMultimedia,
  eliminarSolicitudMultimedia,
  getSolicitudesMultimedia,
  getUnaSolicitudMultimedia,
  validarEmail,
} from "../controllers/solicitudMultimedia.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getSolicitudesMultimedia);
router.get("/:id", validarJWT, getUnaSolicitudMultimedia);
router.post(
  "/",
  [
    check("razonSolicitud_id", "Seleccione la razón de la solicitud")
      .not()
      .isEmpty(),
    validarCampos,
  ],
  crearSolicitudMultimedia
);
router.put("/:id", validarJWT, actualizarSolicitudMultimedia);
router.delete("/:id", validarJWT, eliminarSolicitudMultimedia);
router.put("/activar/:id", validarJWT, activarSolicitudMultimedia);
router.get("/buscarcorreo/:email", buscarCorreoElectronico);
router.put("/validaremail/:id", validarEmail);

export default router;
