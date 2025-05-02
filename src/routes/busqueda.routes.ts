/* 
  Path: '/api/todo/:busquedas'
*/

import { Router } from "express";
import { getTodo } from "../controllers/busqueda.controller";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/:busqueda", validarJWT, getTodo);

export default router;
