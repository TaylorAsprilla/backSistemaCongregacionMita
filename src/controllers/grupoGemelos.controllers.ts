import { Request, Response } from "express";
import GrupoGemelos from "../models/grupoGemelos.model";
import Usuario from "../models/usuario.model";
import UsuarioGrupoGemelos from "../models/usuarioGrupoGemelos.model";

export const crearGrupoGemelos = async (req: Request, res: Response) => {
  try {
    const { tipo, descripcion, fechaNacimientoComun, usuarios } = req.body;

    // Crear el grupo de gemelos
    const grupo = await GrupoGemelos.create({
      tipo,
      descripcion,
      fechaNacimientoComun,
    });

    // Asociar usuarios al grupo (si se proporcionan)
    if (usuarios && usuarios.length > 0) {
      await (grupo as any).grupo.setUSuarios(usuarios); // usuarios es un array de IDs
    }

    res.status(201).json({ ok: true, grupo });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ ok: false, msg: "Error al crear grupo de gemelos", error });
  }
};

export const obtenerGruposGemelos = async (req: Request, res: Response) => {
  try {
    const grupos = await GrupoGemelos.findAll({
      include: {
        model: Usuario,
        through: { attributes: [] },
        attributes: ["id", "primerNombre", "primerApellido", "fechaNacimiento"],
      },
    });

    res.json({ ok: true, grupos });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ ok: false, msg: "Error al obtener grupos de gemelos", error });
  }
};

export const obtenerGrupoGemelosPorId = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const grupo = await GrupoGemelos.findByPk(id, {
      include: {
        model: Usuario,
        through: { attributes: [] },
        attributes: ["id", "primerNombre", "primerApellido", "fechaNacimiento"],
      },
    });

    if (!grupo) {
      return res.status(404).json({ ok: false, msg: "Grupo no encontrado" });
    }

    res.json({ ok: true, grupo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error al obtener grupo", error });
  }
};

export const actualizarGrupoGemelos = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tipo, descripcion, fechaNacimientoComun, usuarios } = req.body;

  try {
    const grupo = await GrupoGemelos.findByPk(id);
    if (!grupo) {
      return res.status(404).json({ ok: false, msg: "Grupo no encontrado" });
    }

    await grupo.update({ tipo, descripcion, fechaNacimientoComun });

    if (usuarios && usuarios.length > 0) {
      await (grupo as any).grupo.setUsuarios(usuarios);
    }

    res.json({ ok: true, grupo });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ ok: false, msg: "Error al actualizar grupo", error });
  }
};

export const eliminarGrupoGemelos = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const grupo = await GrupoGemelos.findByPk(id);
    if (!grupo) {
      return res.status(404).json({ ok: false, msg: "Grupo no encontrado" });
    }

    await UsuarioGrupoGemelos.destroy({ where: { grupoGemelos_id: id } });
    await grupo.destroy();

    res.json({ ok: true, msg: "Grupo eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error al eliminar grupo", error });
  }
};
