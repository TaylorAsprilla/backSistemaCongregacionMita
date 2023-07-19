import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import UsuarioFuenteIngreso from "../models/usuarioFuenteIngreso.model";
import UsuarioMinisterio from "../models/usuarioMinisterio.model";
import UsuarioVoluntariado from "../models/usuarioVoluntariado.model";

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
  await UsuarioFuenteIngreso.bulkCreate(
    fuentesDeIngreso.map((fuenteDeIngresoId) => ({
      usuario_id,
      fuenteIngreso_id: fuenteDeIngresoId,
    })),
    { transaction }
  );

  await UsuarioMinisterio.bulkCreate(
    ministerios.map((ministerioId) => ({
      usuario_id,
      ministerio_id: ministerioId,
    })),
    { transaction }
  );

  await UsuarioVoluntariado.bulkCreate(
    voluntariados.map((voluntariadoId) => ({
      usuario_id,
      voluntariado_id: voluntariadoId,
    })),
    { transaction }
  );
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
