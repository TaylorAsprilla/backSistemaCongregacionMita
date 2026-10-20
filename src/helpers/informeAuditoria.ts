import { Op } from "sequelize";
import InformeAuditoria from "../models/informeAuditoria.model";
import Usuario from "../models/usuario.model";

export async function registrarAuditoriaInforme(datos: {
  informe_id: number;
  seccion: string;
  registro_id?: number | null;
  accion: string;
  usuario_id?: number | null;
  cambios?: unknown;
  transaction?: any;
}) {
  return InformeAuditoria.create(
    {
      informe_id: datos.informe_id,
      seccion: datos.seccion,
      registro_id: datos.registro_id ?? null,
      accion: datos.accion,
      usuario_id: datos.usuario_id ?? null,
      cambios: datos.cambios ?? null,
      fecha: new Date(),
    },
    datos.transaction ? { transaction: datos.transaction } : undefined,
  );
}

export async function obtenerAuditoriaAutorizada(informeId: number) {
  const registros = await InformeAuditoria.findAll({
    where: { informe_id: informeId },
    order: [
      ["fecha", "DESC"],
      ["id", "DESC"],
    ],
  });
  const usuariosIds = Array.from(
    new Set(
      registros
        .map((registro) => Number(registro.getDataValue("usuario_id")))
        .filter(Number.isInteger),
    ),
  );
  const usuarios = usuariosIds.length
    ? await Usuario.findAll({
        where: { id: { [Op.in]: usuariosIds } },
        attributes: ["id", "primerNombre", "segundoNombre", "primerApellido", "segundoApellido"],
      })
    : [];
  const nombres = new Map(
    usuarios.map((usuario) => [
      Number(usuario.getDataValue("id")),
      [
        usuario.getDataValue("primerNombre"),
        usuario.getDataValue("segundoNombre"),
        usuario.getDataValue("primerApellido"),
        usuario.getDataValue("segundoApellido"),
      ]
        .filter(Boolean)
        .join(" "),
    ]),
  );
  return registros.map((registro) => ({
    id: registro.getDataValue("id"),
    seccion: registro.getDataValue("seccion"),
    registro_id: registro.getDataValue("registro_id"),
    accion: registro.getDataValue("accion"),
    usuario_id: registro.getDataValue("usuario_id"),
    usuario:
      nombres.get(Number(registro.getDataValue("usuario_id"))) ?? null,
    fecha: registro.getDataValue("fecha"),
    cambios: registro.getDataValue("cambios"),
  }));
}
