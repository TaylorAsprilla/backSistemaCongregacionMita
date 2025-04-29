/* 
  Path: '/api/supervisorcongregacion'
*/

import { Router } from "express";
import { getFeligreses } from "../controllers/supervisorCongregacion.controller";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/:id", validarJWT, getFeligreses);

export default router;
