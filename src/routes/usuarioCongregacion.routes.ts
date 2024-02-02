import { Router } from "express";
import validarJWT from "../middlewares/validar-jwt";
import {
  getUsuariosPorCampo,
  getUsuariosPorCongregacion,
  getUsuariosPorPais,
} from "../controllers/usuarioCongregacion.controllers";

const router = Router();

router.get("/pais", validarJWT, getUsuariosPorPais);
router.get("/congregacion", validarJWT, getUsuariosPorCongregacion);
router.get("/campo", validarJWT, getUsuariosPorCampo);

export default router;
