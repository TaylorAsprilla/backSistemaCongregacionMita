/* 
  Path: '/api/opciontransporte'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarOpcionTransporte,
  actualizaropcionTransporte,
  crearOpcionTransporte,
  eliminarOpcionTransporte,
  getOpcionTransporte,
  getUnaOpcionTransporte,
} from "../controllers/opcionTransporte.controller";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getOpcionTransporte);
router.get("/:id", validarJWT, getUnaOpcionTransporte);
router.post(
  "/",
  [
    check("tipoTransporte", "La opción de transporte es obligatoria")
      .not()
      .isEmpty(),

    validarCampos,
    validarJWT,
  ],
  crearOpcionTransporte
);
router.put(
  "/:id",
  [
    check("tipoTransporte", "La opción de transporte es obligatoria")
      .not()
      .isEmpty(),
    validarCampos,
    validarJWT,
  ],
  actualizaropcionTransporte
);
router.delete("/:id", validarJWT, eliminarOpcionTransporte);
router.put("/activar/:id", validarJWT, activarOpcionTransporte);

export default router;
