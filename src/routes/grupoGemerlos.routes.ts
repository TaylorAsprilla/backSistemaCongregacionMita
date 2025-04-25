import { Router } from "express";
import {
  actualizarGrupoGemelos,
  crearGrupoGemelos,
  eliminarGrupoGemelos,
  obtenerGrupoGemelosPorId,
  obtenerGruposGemelos,
} from "../controllers/grupoGemelos.controllers";

const router = Router();

// Ruta para crear un grupo de gemelos
router.post("/", crearGrupoGemelos);

// Ruta para obtener todos los grupos de gemelos
router.get("/", obtenerGruposGemelos);

// Ruta para obtener un grupo de gemelos por ID
router.get("/:id", obtenerGrupoGemelosPorId);

// Ruta para actualizar un grupo de gemelos por ID
router.put("/:id", actualizarGrupoGemelos);

// Ruta para eliminar un grupo de gemelos por ID
router.delete("/:id", eliminarGrupoGemelos);

export default router;
