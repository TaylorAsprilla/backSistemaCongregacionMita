/* 
  Path: '/api/buscarcelular/?numeroCelular'
*/

import { Router } from "express";
import { buscarCelular } from "../controllers/usuario.controllers";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, buscarCelular);

export default router;
