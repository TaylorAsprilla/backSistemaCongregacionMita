/* 
  Path: '/api/solicitudmultimedia'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarSolicitud,
  actualizarSolicitud,
  buscarCorreoElectronico,
  crearSolicitud,
  eliminarSolicitud,
  getSolicitudes,
  getUnaSolicitud,
  validarEmail,
} from "../controllers/solicitud.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getSolicitudes);
router.get("/:id", validarJWT, getUnaSolicitud);
router.post(
  "/",
  [
    check("nombre", "El nombre es obligatorio").not().isEmpty(),
    check("direccion", "La dirección es obligatoria").not().isEmpty(),
    check("ciudad", "La ciudad es obligatoria").not().isEmpty(),
    check("celular", "El número de celular es obligatorio").not().isEmpty(),
    check("email", "El correo electrónico es obligatorio").isEmail(),
    check(
      "miembroCongregacion",
      "Selecciones si es o no miembro de la congregación Mita"
    )
      .not()
      .isEmpty(),
    validarCampos,
  ],
  crearSolicitud
);
router.put("/:id", validarJWT, actualizarSolicitud);
router.delete("/:id", validarJWT, eliminarSolicitud);
router.put("/activar/:id", validarJWT, activarSolicitud);
router.get("/buscarcorreo/:email", buscarCorreoElectronico);
router.put("/validaremail/:id", validarEmail);

export default router;
