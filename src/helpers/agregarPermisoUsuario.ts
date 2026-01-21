import { Transaction } from "sequelize";
import UsuarioPermiso from "../models/usuarioPermiso.model";

/**
 * Agrega un permiso a un usuario si no lo tiene ya
 * @param usuario_id - ID del usuario al que se le agregará el permiso
 * @param permiso_id - ID del permiso a agregar
 * @param transaction - Transacción de Sequelize (opcional)
 * @returns Promise<boolean> - true si se agregó el permiso, false si ya existía
 */
const agregarPermisoUsuario = async (
  usuario_id: number,
  permiso_id: number | string,
  transaction?: Transaction,
): Promise<boolean> => {
  try {
    // Verificar si el permiso ya existe
    const permisoExistente = await UsuarioPermiso.findOne({
      where: {
        usuario_id,
        permiso_id,
      },
      transaction,
    });

    // Si el permiso ya existe, no hacer nada
    if (permisoExistente) {
      return false;
    }

    // Crear el nuevo permiso
    await UsuarioPermiso.create(
      {
        usuario_id,
        permiso_id,
      },
      { transaction },
    );

    return true;
  } catch (error) {
    console.error("Error al agregar permiso al usuario:", error);
    throw error;
  }
};

export default agregarPermisoUsuario;
