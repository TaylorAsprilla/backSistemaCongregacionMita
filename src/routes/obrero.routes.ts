import { Router } from "express";
import { getObreros } from "../controllers/obrero.controller";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getObreros);

export default router;
