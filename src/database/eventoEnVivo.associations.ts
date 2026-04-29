import AuditoriaEventoEnVivo from "../models/auditoriaEventoEnVivo.model";
import { AUDITORIA_EVENTO_EN_VIVO_ENUM } from "../enum/auditoriaEventoEnVivo.enum";

export async function auditoriaEventoEnVivo(
  eventoEnVivo_id: number,
  usuario_id: number,
  accion: AUDITORIA_EVENTO_EN_VIVO_ENUM,
  transaction: any,
) {
  await AuditoriaEventoEnVivo.create(
    {
      accion,
      eventoEnVivo_id,
      usuario_id,
    },
    { transaction },
  );
}
