import { Router } from "express";
import validarJWT from "../middlewares/validar-jwt";
import { getUsuariosRegistradosPorElUsuario } from "../controllers/ayudante.controllers";

const router = Router();

router.get("/", validarJWT, getUsuariosRegistradosPorElUsuario);

export default router;
