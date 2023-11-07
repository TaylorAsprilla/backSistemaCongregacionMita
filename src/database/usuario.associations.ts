import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import UsuarioFuenteIngreso from "../models/usuarioFuenteIngreso.model";
import UsuarioMinisterio from "../models/usuarioMinisterio.model";
import UsuarioVoluntariado from "../models/usuarioVoluntariado.model";
import AuditoriaUsuario from "../models/auditoriaUsuario.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import { AUDITORIAUSUARIO_ENUM } from "../enum/auditoriaUsuario.enum";

export async function eliminarAsociacionesUsuario(
  id: number,
  transaction: any
) {
  await UsuarioFuenteIngreso.destroy({
    where: { usuario_id: id },
    transaction,
  });

  await UsuarioMinisterio.destroy({
    where: { usuario_id: id },
    transaction,
  });

  await UsuarioVoluntariado.destroy({
    where: { usuario_id: id },
    transaction,
  });
}

export async function crearAsociacionesUsuario(
  usuario_id: number,
  fuentesDeIngreso: number[],
  ministerios: number[],
  voluntariados: number[],

  transaction: any
) {
  const fuenteIngresoPromises = fuentesDeIngreso.map((fuenteDeIngresoId) =>
    UsuarioFuenteIngreso.create(
      {
        usuario_id,
        fuenteIngreso_id: fuenteDeIngresoId,
      },
      { transaction }
    )
  );

  const ministerioPromises = ministerios.map((ministerioId) =>
    UsuarioMinisterio.create(
      {
        usuario_id,
        ministerio_id: ministerioId,
      },
      { transaction }
    )
  );

  const voluntariadoPromises = voluntariados.map((voluntariadoId) =>
    UsuarioVoluntariado.create(
      {
        usuario_id,
        voluntariado_id: voluntariadoId,
      },
      { transaction }
    )
  );

  await Promise.all([
    ...fuenteIngresoPromises,
    ...ministerioPromises,
    ...voluntariadoPromises,
  ]);
}

export async function crearCongregacionUsuario(
  usuario_id: number,
  pais_id: number,
  congregacion_id: number,
  campo_id: number,
  transaction: any
) {
  await UsuarioCongregacion.create(
    {
      usuario_id,
      pais_id,
      congregacion_id,
      campo_id,
    },
    { transaction }
  );
}

export async function actualizarCongregacion(
  usuario_id: number,
  pais_id: number,
  congregacion_id: number,
  campo_id: number,
  transaction: any
) {
  const congregacionExistente = await UsuarioCongregacion.findOne({
    where: {
      usuario_id,
    },
    transaction,
  });

  if (congregacionExistente) {
    await UsuarioCongregacion.update(
      {
        pais_id,
        congregacion_id,
        campo_id,
      },
      {
        where: {
          usuario_id,
        },
        transaction,
      }
    );
  } else {
    await UsuarioCongregacion.create(
      {
        usuario_id,
        pais_id,
        congregacion_id,
        campo_id,
      },
      { transaction }
    );
  }
}

export async function auditoriaUsuario(
  usuario_id: number,
  usuarioQueRegistra_id: number,
  accion: AUDITORIAUSUARIO_ENUM,
  transaction: any
) {
  await AuditoriaUsuario.create(
    {
      accion,
      usuario_id,
      usuarioQueRegistra_id,
    },
    { transaction }
  );
}

export async function agregarPermisos(
  usuario_id: number,
  permisos: number[],
  transaction: any
) {
  if (typeof usuario_id !== "number" || !Array.isArray(permisos)) {
    throw new Error("Parámetros de entrada no válidos.");
  }

  try {
    // Eliminar los permisos existentes del usuario
    await UsuarioPermiso.destroy({
      where: { usuario_id },
      transaction,
    });

    // Crear un arreglo de objetos para la inserción masiva
    const permisosBulkInsert = permisos.map((permisoId) => ({
      usuario_id,
      permiso_id: permisoId,
    }));

    // Realizar una inserción masiva de permisos
    await UsuarioPermiso.bulkCreate(permisosBulkInsert, { transaction });

    return true; // Opcional: indicar que la operación se realizó con éxito
  } catch (error) {
    throw error; // Lanzar el error para que pueda ser manejado en niveles superiores
  }
}
