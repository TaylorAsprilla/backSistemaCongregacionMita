/* 
  Path: '/api/nacionalidad'
*/

import { Router } from "express";
import {
  getNacionalidad,
  getNacionalidades,
} from "../controllers/nacionalidad.controller";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", getNacionalidades);
router.get("/:id", validarJWT, getNacionalidad);

export default router;
