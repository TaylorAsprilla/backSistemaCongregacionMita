/* 
  Path: '/api/supervisorcongregacion'
*/

import { Router } from "express";
import { getFeligreses } from "../controllers/supervisorCongregacion.controllers";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/:id", validarJWT, getFeligreses);

export default router;
