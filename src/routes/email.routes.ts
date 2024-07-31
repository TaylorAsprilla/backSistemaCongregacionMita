import { Router } from "express";
import validarJWT from "../middlewares/validar-jwt";
import { enviarEmailBienvenida } from "../controllers/email.controllers";

const router = Router();

router.get("/:id", validarJWT, enviarEmailBienvenida);

export default router;
