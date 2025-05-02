import { Request, Response } from "express";
import GrupoGemelos from "../models/grupoGemelos.model";
import UsuarioGrupoGemelos from "../models/usuarioGrupoGemelos.model";
import Usuario from "../models/usuario.model";

export const crearGrupoGemelos = async (req: Request, res: Response) => {
  try {
    const { tipo, descripcion, fechaNacimientoComun, usuarios } = req.body;

    const grupo = await GrupoGemelos.create({
      tipo,
      descripcion,
      fechaNacimientoComun,
    });

    if (usuarios && usuarios.length > 0) {
      const relaciones = usuarios.map((usuarioId: number) => ({
        usuario_id: usuarioId,
        grupoGemelos_id: grupo.getDataValue("id"),
      }));
      await UsuarioGrupoGemelos.bulkCreate(relaciones);
    }

    res.json({ ok: true, grupo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error al crear el grupo", error });
  }
};

export const CrearGrupoConUsuarios = async (req: Request, res: Response) => {
  const { tipo, descripcion, fechaNacimientoComun, usuarios } = req.body;

  if (
    !Array.isArray(usuarios) ||
    usuarios.length < 2 ||
    !usuarios.every((u) => Number.isInteger(u))
  ) {
    return res.status(400).json({
      ok: false,
      msg: "Debes enviar un array válido con al menos dos IDs de usuario",
    });
  }

  try {
    const grupo = await GrupoGemelos.create({
      tipo,
      descripcion,
      fechaNacimientoComun,
    });

    const relaciones = usuarios.map((usuario_id: number) => ({
      grupoGemelos_id: grupo.getDataValue("id"),
      usuario_id,
    }));

    await UsuarioGrupoGemelos.bulkCreate(relaciones);

    res.status(201).json({
      ok: true,
      msg: "Grupo creado y usuarios asignados",
      grupoId: grupo.getDataValue("id"),
      usuarios,
      tipo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Error al crear grupo de gemelos",
    });
  }
};

// Obtener todos los grupos
export const obtenerGruposGemelos = async (req: Request, res: Response) => {
  try {
    const grupos = await GrupoGemelos.findAll({
      include: {
        model: Usuario,
        as: "usuarios",
        through: {
          attributes: [],
        },
        attributes: [
          "id",
          "primerNombre",
          "segundoNombre",
          "primerApellido",
          "segundoApellido",
          "apodo",
          "fechaNacimiento",
          "email",
          "numeroCelular",
        ],
      },
    });
    res.json({ ok: true, grupos });
  } catch (error) {
    res
      .status(500)
      .json({ ok: false, msg: "Error al obtener los grupos", error });
  }
};

// Obtener un grupo por ID
export const obtenerGrupoPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const grupo = await GrupoGemelos.findByPk(id);

    if (!grupo) {
      return res.status(404).json({ ok: false, msg: "Grupo no encontrado" });
    }

    res.json({ ok: true, grupo });
  } catch (error) {
    res
      .status(500)
      .json({ ok: false, msg: "Error al obtener el grupo", error });
  }
};

// Agregar un usuario a un grupo
export const agregarUsuarioAGrupo = async (req: Request, res: Response) => {
  try {
    const { usuario_id, grupoGemelos_id } = req.body;

    await UsuarioGrupoGemelos.create({
      grupoGemelos_id: grupoGemelos_id,
      usuario_id: usuario_id,
    });

    res.json({ ok: true, msg: "Usuario agregado al grupo" });
  } catch (error) {
    res.status(500).json({ ok: false, msg: "Error al agregar usuario", error });
  }
};

// Eliminar un grupo
export const eliminarGrupoGemelos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await UsuarioGrupoGemelos.destroy({ where: { grupoGemelos_id: id } });
    await GrupoGemelos.destroy({ where: { id } });

    res.json({ ok: true, msg: "Grupo eliminado" });
  } catch (error) {
    res.status(500).json({ ok: false, msg: "Error al eliminar grupo", error });
  }
};
