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
  getSolicitudesMultimedia,
  getUnaSolicitudMultimedia,
  obtenerUsuariosConSolicitudesPorCongregacion,
  validarEmail,
} from "../controllers/solicitudMultimedia.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import {
  denegarSolicitudMultimedia,
  eliminarSolicitudMultimedia,
} from "../controllers/accesoMultimedia.controllers";

const router = Router();

// Rutas específicas
router.get(
  "/pendientes",
  validarJWT,
  obtenerUsuariosConSolicitudesPorCongregacion
);
router.get("/buscarcorreo/:email", buscarCorreoElectronico);
router.put("/validaremail/:id", validarEmail);
router.put("/activar/:id", validarJWT, activarSolicitudMultimedia);
router.post(
  "/denegarSolicitud",
  [
    check("solicitud_id", "El Id de la solicitud es obligatoria")
      .not()
      .isEmpty(),
    check(
      "motivoDeNegacion",
      "El motivo de negacion de la solicitud es obligatoria"
    )
      .not()
      .isEmpty(),
    validarCampos,
  ],
  denegarSolicitudMultimedia
);

// Rutas principales
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
  crearSolicitudMultimedia // Crear una nueva solicitud
);
router.put("/:id", validarJWT, actualizarSolicitudMultimedia); // Actualizar una solicitud específica
router.delete("/:id", validarJWT, eliminarSolicitudMultimedia); // Eliminar una solicitud específica

export default router;
