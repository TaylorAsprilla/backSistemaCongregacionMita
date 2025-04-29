import { Router } from "express";
import {
  generarQrCode,
  getUltimoQrGenerado,
  loginPorQr,
} from "../controllers/accesoQR.controller";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/ultimoQr", validarJWT, getUltimoQrGenerado);
router.post("/generarQr", validarJWT, generarQrCode);
router.post("/loginQr", loginPorQr);

export default router;
