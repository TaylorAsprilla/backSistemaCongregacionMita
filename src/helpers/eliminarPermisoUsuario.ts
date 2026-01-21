import { Transaction } from "sequelize";
import UsuarioPermiso from "../models/usuarioPermiso.model";

/**
 * Elimina un permiso específico de un usuario
 * @param usuario_id - ID del usuario al que se le eliminará el permiso
 * @param permiso_id - ID del permiso a eliminar
 * @param transaction - Transacción de Sequelize (opcional)
 * @returns Promise<boolean> - true si se eliminó el permiso, false si no existía
 */
const eliminarPermisoUsuario = async (
  usuario_id: number,
  permiso_id: number | string,
  transaction?: Transaction,
): Promise<boolean> => {
  try {
    const permisosEliminados = await UsuarioPermiso.destroy({
      where: {
        usuario_id,
        permiso_id,
      },
      transaction,
    });

    return permisosEliminados > 0;
  } catch (error) {
    console.error("Error al eliminar permiso del usuario:", error);
    throw error;
  }
};

export default eliminarPermisoUsuario;
