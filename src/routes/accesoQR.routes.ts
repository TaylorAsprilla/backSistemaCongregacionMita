import { Router } from "express";
import {
  generarQrCode,
  getQrAccesos,
  getUltimoQrGenerado,
  loginPorQr,
  solicitarCodigoQr,
} from "../controllers/accesoQR.controller";
import validarJWT from "../middlewares/validar-jwt";
import validarAdministracionQr from "../middlewares/validar-administracion-qr";
import { rateLimiter } from "../middlewares/rate-limiter";

const router = Router();

router.get("/ultimoQr", validarJWT, validarAdministracionQr, getUltimoQrGenerado);
router.get("/listadoAccesos", validarJWT, validarAdministracionQr, getQrAccesos);
router.post("/generarQr", validarJWT, validarAdministracionQr, generarQrCode);
router.post("/solicitarCodigo", rateLimiter(20, 15 * 60000), solicitarCodigoQr);
router.post("/loginQr", rateLimiter(30, 15 * 60000), loginPorQr);

export default router;
