import { Router } from "express";
import validarJWT from "../middlewares/validar-jwt";
import {
  emailBienvenidaObreroACongregacion,
  enviarEmailBienvenida,
} from "../controllers/email.controller";

const router = Router();

router.post("/:id", validarJWT, enviarEmailBienvenida);

router.post(
  "/asignarCongregacion/:id/:idCongreacion",
  emailBienvenidaObreroACongregacion
);

export default router;
