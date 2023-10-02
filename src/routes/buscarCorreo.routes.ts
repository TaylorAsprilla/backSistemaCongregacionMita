/* 
  Path: '/api/buscarcorreo/?email'
*/

import { Router } from "express";
import { buscarCorreoElectronico } from "../controllers/usuario.controllers";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, buscarCorreoElectronico);

export default router;
