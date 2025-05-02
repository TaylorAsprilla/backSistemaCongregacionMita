import { Router } from "express";
import {
  crearGrupoGemelos,
  obtenerGruposGemelos,
  obtenerGrupoPorId,
  agregarUsuarioAGrupo,
  eliminarGrupoGemelos,
  CrearGrupoConUsuarios,
} from "../controllers/grupoGemelos.controller";

const router = Router();

// Crear un nuevo grupo de gemelos
router.post("/crear-grupo-usuarios", CrearGrupoConUsuarios);

// Crear un nuevo grupo de gemelos
router.post("/nuevo-grupo", crearGrupoGemelos);

// Obtener todos los grupos
router.get("/", obtenerGruposGemelos);

// Obtener un grupo por ID
router.get("/:id", obtenerGrupoPorId);

// Agregar un usuario a un grupo existente
router.post("/agregar-usuario", agregarUsuarioAGrupo);

// Eliminar un grupo
router.delete("/grupo-gemelos/:id", eliminarGrupoGemelos);

export default router;
