import { Router } from "express";
import { generarQrCode, loginPorQr } from "../controllers/accesoQR.controllers";

const router = Router();

router.post("/generarQr", generarQrCode);
router.post("/loginQr", loginPorQr);

export default router;
