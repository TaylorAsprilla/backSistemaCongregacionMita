import { Router } from "express";
import { generarQrCode, loginPorQr } from "../controllers/accesoQR.controllers";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.post("/generarQr", validarJWT, generarQrCode);
router.post("/loginQr", loginPorQr);

export default router;
