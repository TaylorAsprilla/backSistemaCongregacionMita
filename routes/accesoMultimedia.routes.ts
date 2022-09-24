/* 
  Path: '/api/accesomultimedia'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarAccesoMultimedia,
  actualizarAccesoMultimedia,
  crearAccesoMultimedia,
  eliminarAccesoMultimedia,
  getAccesoMultimedia,
  getUnAccesoMultimedia,
} from "../controllers/accesoMultimedia.controllers";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getAccesoMultimedia);
router.get("/:id", validarJWT, getUnAccesoMultimedia);
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
    validarJWT,
  ],
  crearAccesoMultimedia
);
router.put("/:id", validarJWT, actualizarAccesoMultimedia);
router.delete("/", validarJWT, eliminarAccesoMultimedia);
router.put("/activar", validarJWT, activarAccesoMultimedia);

export default router;
