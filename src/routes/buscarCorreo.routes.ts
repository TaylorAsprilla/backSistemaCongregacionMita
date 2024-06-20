/* 
  Path: '/api/buscarcorreo/?email&idUsuario'
*/

import { Router } from "express";
import { buscarCorreoElectronico } from "../controllers/usuario.controllers";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, buscarCorreoElectronico);

export default router;
