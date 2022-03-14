/* 
  Path: '/api/login'
*/

import { Router } from "express";
import { check } from "express-validator";
import { login } from "../controllers/login.controllers";
import validarCampos from "../middlewares/validar-campos";

const router = Router();

router.post(
  "/",
  [
    check("login", "El nombre de usuario es obligatorio").not().isEmpty(),
    check("password", "El password es obligatorio").not().isEmpty(),
    validarCampos,
  ],
  login
);

export default router;
