import express, { NextFunction, Request, Response, Router } from "express";
import validarJWT from "../middlewares/validar-jwt";
import {
  eliminarFotoPerfil,
  obtenerFotoPerfil,
  obtenerUrlsFotos,
  subirFotoPerfil,
} from "../controllers/fotoPerfil.controller";
import { FOTO_PERFIL_MAX_BYTES } from "../helpers/fotoPerfil";

const router = Router();

const cuerpoBinario = express.raw({
  type: ["image/jpeg", "image/png", "image/webp", "application/octet-stream"],
  limit: FOTO_PERFIL_MAX_BYTES,
});

// Traduce los errores del parser a los códigos de la funcionalidad.
const manejarErrorCuerpo = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (!err) return next();
  const tooLarge = err.type === "entity.too.large";
  return res.status(tooLarge ? 413 : 400).json({
    ok: false,
    success: false,
    code: tooLarge ? "IMAGEN_MUY_GRANDE" : "IMAGEN_CORRUPTA",
    message: tooLarge
      ? "La imagen supera el tamaño máximo permitido de 5 MB."
      : "No se pudo leer la imagen enviada.",
  });
};

/** @route GET /api/foto-perfil  @access Autenticado (foto propia) */
router.get("/", validarJWT, obtenerFotoPerfil);

/** @route POST /api/foto-perfil/urls  @access Autenticado (avatares en lote) */
router.post("/urls", validarJWT, obtenerUrlsFotos);

/** @route POST /api/foto-perfil  @access Autenticado (foto propia; id tomado del JWT) */
router.post("/", validarJWT, cuerpoBinario, manejarErrorCuerpo, subirFotoPerfil);

/** @route DELETE /api/foto-perfil  @access Autenticado (foto propia) */
router.delete("/", validarJWT, eliminarFotoPerfil);

export default router;
