/* 
  Path: '/api/evento'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  activarLinkEvento,
  actualizarLinkEvento,
  agregarALaBiblioteca,
  crearLinkEvento,
  eliminarDeLaBiblioteca,
  eliminarLinkEvento,
  getLinkEventos,
  getUltimoEvento,
  getUnLinkEvento,
} from "../controllers/linkEvento.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getLinkEventos);
router.get("/:id", validarJWT, getUnLinkEvento);
router.get("/link/servicio", validarJWT, getUltimoEvento);
router.post(
  "/",
  [
    check("link", "El link es obligatorio").not().isEmpty(),
    check("tipoEvento_id", "El tipo de evento es obligatorio").not().isEmpty(),
    check("fecha", "El tipo de evento es obligatorio").not().isEmpty(),
    check("plataforma", "El tipo de evento es obligatorio").not().isEmpty(),
    check("titulo", "El tipo de evento es obligatorio").not().isEmpty(),
    validarCampos,
    validarJWT,
  ],
  crearLinkEvento
);
router.put("/:id", validarJWT, actualizarLinkEvento);
router.put("/activar/:id", validarJWT, activarLinkEvento);
router.put("/agregarbiblioteca/:id", validarJWT, agregarALaBiblioteca);
router.put("/eliminarDeBiblioteca/:id", validarJWT, eliminarDeLaBiblioteca);
router.delete("/:id", validarJWT, eliminarLinkEvento);

export default router;
