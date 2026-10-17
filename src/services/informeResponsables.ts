import { Op, Transaction } from "sequelize";
import Campo from "../models/campo.model";
import Congregacion from "../models/congregacion.model";
import InformeResponsable from "../models/informeResponsable.model";
import Pais from "../models/pais.model";
import Usuario from "../models/usuario.model";

export type TipoCongregacionInforme = "PAIS" | "CONGREGACION" | "CAMPO";

export interface AmbitoInforme {
  tipo_congregacion: TipoCongregacionInforme;
  congregacion_id: number;
  nombre_unidad: string;
  nombre_pais: string | null;
  nombre_congregacion: string | null;
  nombre_campo: string | null;
  responsables: ResponsableInforme[];
  informe?: unknown;
}

export interface ResponsableInforme {
  usuario_id: number;
  nombre_responsable: string;
  tipo_responsabilidad: string;
}

type UnidadInterna = AmbitoInforme & {
  responsables: ResponsableInforme[];
  responsablePrincipalId?: number | null;
  responsableAuxiliarId?: number | null;
};

const enteroValido = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const nombreCompleto = (usuario: any): string =>
  [
    usuario.getDataValue("primerNombre"),
    usuario.getDataValue("segundoNombre"),
    usuario.getDataValue("primerApellido"),
    usuario.getDataValue("segundoApellido"),
  ]
    .filter((parte) => typeof parte === "string" && parte.trim())
    .join(" ");

const mapUsuarios = (usuarios: any[]): Map<number, string> =>
  new Map(
    usuarios.map((usuario) => [
      Number(usuario.getDataValue("id")),
      nombreCompleto(usuario),
    ]),
  );

const crearAmbito = (
  tipo_congregacion: TipoCongregacionInforme,
  congregacion_id: number,
  nombre_unidad: string,
  datos: Partial<AmbitoInforme> = {},
  responsablePrincipalId?: number | null,
  responsableAuxiliarId?: number | null,
): UnidadInterna => ({
  tipo_congregacion,
  congregacion_id,
  nombre_unidad,
  nombre_pais: datos.nombre_pais ?? null,
  nombre_congregacion: datos.nombre_congregacion ?? null,
  nombre_campo: datos.nombre_campo ?? null,
  responsables: [],
  responsablePrincipalId,
  responsableAuxiliarId,
});

export const obtenerAmbitosResponsabilidad = async (
  usuarioId: number,
): Promise<AmbitoInforme[]> => {
  const [paisesDirectos, congregacionesDirectas, camposDirectos] =
    await Promise.all([
      Pais.findAll({
        attributes: ["id", "pais"],
        where: { idObreroEncargado: usuarioId, estado: true },
      }),
      Congregacion.findAll({
        attributes: [
          "id",
          "congregacion",
          "pais_id",
          "idObreroEncargado",
          "idObreroEncargadoDos",
        ],
        where: {
          estado: true,
          [Op.or]: [
            { idObreroEncargado: usuarioId },
            { idObreroEncargadoDos: usuarioId },
          ],
        },
      }),
      Campo.findAll({
        attributes: [
          "id",
          "campo",
          "congregacion_id",
          "idObreroEncargado",
          "idObreroEncargadoDos",
        ],
        where: {
          estado: true,
          [Op.or]: [
            { idObreroEncargado: usuarioId },
            { idObreroEncargadoDos: usuarioId },
          ],
        },
      }),
    ]);
  const congregacionesAsignadas = congregacionesDirectas;
  const camposAsignados = camposDirectos;

  const paisIds = [
    ...new Set([
      ...paisesDirectos.map((unidad) => Number(unidad.getDataValue("id"))),
      ...congregacionesAsignadas.map((unidad) => Number(unidad.getDataValue("pais_id"))),
    ]),
  ].filter((id) => id > 0);
  const paisesRelacionados = paisIds.length
    ? await Pais.findAll({
        attributes: ["id", "pais"],
        where: { id: { [Op.in]: paisIds } },
      })
    : [];
  const nombresPais = new Map(
    paisesRelacionados.map((pais) => [
      Number(pais.getDataValue("id")),
      pais.getDataValue("pais") as string,
    ]),
  );

  const congregacionPadreIds = [
    ...new Set(camposAsignados.map((campo) => Number(campo.getDataValue("congregacion_id")))),
  ].filter((id) => id > 0);
  const congregacionesPadre = congregacionPadreIds.length
    ? await Congregacion.findAll({
        attributes: ["id", "congregacion", "pais_id"],
        where: { id: { [Op.in]: congregacionPadreIds } },
      })
    : [];
  const padres = new Map(
    congregacionesPadre.map((congregacion) => [
      Number(congregacion.getDataValue("id")),
      {
        nombre: congregacion.getDataValue("congregacion") as string,
        paisId: Number(congregacion.getDataValue("pais_id")),
      },
    ]),
  );

  const ambitos: UnidadInterna[] = [
    ...paisesDirectos.map((pais) =>
      crearAmbito(
        "PAIS",
        Number(pais.getDataValue("id")),
        pais.getDataValue("pais") as string,
        { nombre_pais: pais.getDataValue("pais") as string },
        usuarioId,
      ),
    ),
    ...congregacionesAsignadas.map((congregacion) => {
      const id = Number(congregacion.getDataValue("id"));
      const paisId = Number(congregacion.getDataValue("pais_id"));
      const principalId = enteroValido(congregacion.getDataValue("idObreroEncargado"));
      const auxiliarId = enteroValido(congregacion.getDataValue("idObreroEncargadoDos"));
      return crearAmbito(
        "CONGREGACION",
        id,
        congregacion.getDataValue("congregacion") as string,
        {
          nombre_pais: nombresPais.get(paisId) ?? null,
          nombre_congregacion: congregacion.getDataValue("congregacion") as string,
        },
        principalId,
        auxiliarId,
      );
    }),
    ...camposAsignados.map((campo) => {
      const padre = padres.get(Number(campo.getDataValue("congregacion_id")));
      return crearAmbito(
        "CAMPO",
        Number(campo.getDataValue("id")),
        campo.getDataValue("campo") as string,
        {
          nombre_pais: padre ? nombresPais.get(padre.paisId) ?? null : null,
          nombre_congregacion: padre?.nombre ?? null,
          nombre_campo: campo.getDataValue("campo") as string,
        },
        enteroValido(campo.getDataValue("idObreroEncargado")),
        enteroValido(campo.getDataValue("idObreroEncargadoDos")),
      );
    }),
  ];

  const unicos = new Map(
    ambitos.map((ambito) => [`${ambito.tipo_congregacion}:${ambito.congregacion_id}`, ambito]),
  );
  const lista = [...unicos.values()];
  await completarResponsablesActuales(lista);
  return lista.map((ambito) => ({
    tipo_congregacion: ambito.tipo_congregacion,
    congregacion_id: ambito.congregacion_id,
    nombre_unidad: ambito.nombre_unidad,
    nombre_pais: ambito.nombre_pais,
    nombre_congregacion: ambito.nombre_congregacion,
    nombre_campo: ambito.nombre_campo,
    responsables: ambito.responsables,
  }));
};

export const obtenerUnidadYResponsablesActuales = async (
  tipoCongregacion: TipoCongregacionInforme,
  congregacionId: number,
  transaction?: Transaction,
): Promise<AmbitoInforme> => {
  const congregacion =
    tipoCongregacion === "PAIS"
      ? await Pais.findByPk(congregacionId, { transaction })
      : tipoCongregacion === "CONGREGACION"
        ? await Congregacion.findByPk(congregacionId, { transaction })
        : await Campo.findByPk(congregacionId, { transaction });

  if (!congregacion) {
    throw new Error("La Congregación responsable del informe ya no existe.");
  }

  let nombrePais: string | null = null;
  let nombreCongregacion: string | null = null;
  let nombreCampo: string | null = null;
  if (tipoCongregacion === "PAIS") {
    nombrePais = congregacion.getDataValue("pais") as string;
  } else if (tipoCongregacion === "CONGREGACION") {
    nombreCongregacion = congregacion.getDataValue("congregacion") as string;
    const pais = await Pais.findByPk(congregacion.getDataValue("pais_id"), { transaction });
    nombrePais = pais?.getDataValue("pais") ?? null;
  } else {
    nombreCampo = congregacion.getDataValue("campo") as string;
    const congregacionCiudad = await Congregacion.findByPk(
      congregacion.getDataValue("congregacion_id"),
      { transaction },
    );
    nombreCongregacion = congregacionCiudad?.getDataValue("congregacion") ?? null;
    const pais = congregacionCiudad
      ? await Pais.findByPk(congregacionCiudad.getDataValue("pais_id"), { transaction })
      : null;
    nombrePais = pais?.getDataValue("pais") ?? null;
  }

  const principalId = enteroValido(congregacion.getDataValue("idObreroEncargado"));
  const auxiliarId = enteroValido(congregacion.getDataValue("idObreroEncargadoDos"));
  const usuarioIds = new Set<number>(
    [principalId, auxiliarId].filter((id): id is number => id !== null),
  );

  const usuarios = usuarioIds.size
    ? await Usuario.findAll({
        attributes: [
          "id",
          "primerNombre",
          "segundoNombre",
          "primerApellido",
          "segundoApellido",
        ],
        where: { id: { [Op.in]: [...usuarioIds] } },
        transaction,
      })
    : [];
  const nombres = mapUsuarios(usuarios);
  const roles = new Map<number, string>();
  if (principalId) {
    roles.set(
      principalId,
      tipoCongregacion === "PAIS" ? "OBRERO_PAIS" : "PRINCIPAL",
    );
  }
  if (auxiliarId && auxiliarId !== principalId) roles.set(auxiliarId, "AUXILIAR");

  const ambito = crearAmbito(
    tipoCongregacion,
    congregacionId,
    String(
      congregacion.getDataValue(
        tipoCongregacion === "PAIS"
          ? "pais"
          : tipoCongregacion === "CONGREGACION"
            ? "congregacion"
            : "campo",
      ),
    ),
    {
      nombre_pais: nombrePais,
      nombre_congregacion: nombreCongregacion,
      nombre_campo: nombreCampo,
    },
    principalId,
    auxiliarId,
  );
  ambito.responsables = [...usuarioIds]
    .map((id) => ({
      usuario_id: id,
      nombre_responsable: nombres.get(id) ?? "Responsable no disponible",
      tipo_responsabilidad:
        roles.get(id) ??
        (id === principalId
          ? tipoCongregacion === "PAIS"
            ? "OBRERO_PAIS"
            : "PRINCIPAL"
          : "AUXILIAR"),
    }))
    .sort((a, b) => {
      const prioridad = (tipo: string) =>
        tipo === "OBRERO_PAIS" || tipo === "PRINCIPAL" ? 0 : tipo === "AUXILIAR" ? 1 : 2;
      return prioridad(a.tipo_responsabilidad) - prioridad(b.tipo_responsabilidad);
    });
  return ambito;
};

export const guardarSnapshotResponsables = async (
  informeId: number,
  responsables: ResponsableInforme[],
  transaction: Transaction,
): Promise<void> => {
  await InformeResponsable.destroy({
    where: { informe_id: informeId },
    transaction,
  });
  if (responsables.length) {
    await InformeResponsable.bulkCreate(
      responsables.map((responsable) => ({
        informe_id: informeId,
        usuario_id: responsable.usuario_id,
        nombre_responsable: responsable.nombre_responsable,
        tipo_responsabilidad: responsable.tipo_responsabilidad,
      })),
      { transaction },
    );
  }
};

const completarResponsablesActuales = async (ambitos: UnidadInterna[]): Promise<void> => {
  const idsPorAmbito = new Map<string, Set<number>>(
    ambitos.map((ambito) => [
      `${ambito.tipo_congregacion}:${ambito.congregacion_id}`,
      new Set(
        [ambito.responsablePrincipalId, ambito.responsableAuxiliarId]
          .map(enteroValido)
          .filter((id): id is number => id !== null),
      ),
    ]),
  );
  const usuarioIds = [...new Set([...idsPorAmbito.values()].flatMap((ids) => [...ids]))];
  const usuarios = usuarioIds.length
    ? await Usuario.findAll({
        attributes: [
          "id",
          "primerNombre",
          "segundoNombre",
          "primerApellido",
          "segundoApellido",
        ],
        where: { id: { [Op.in]: usuarioIds } },
      })
    : [];
  const nombres = mapUsuarios(usuarios);

  for (const ambito of ambitos) {
    const ids =
      idsPorAmbito.get(
        `${ambito.tipo_congregacion}:${ambito.congregacion_id}`,
      ) ?? new Set();
    const roles = new Map<number, string>();
    if (ambito.responsablePrincipalId) {
      roles.set(
        ambito.responsablePrincipalId,
        ambito.tipo_congregacion === "PAIS" ? "OBRERO_PAIS" : "PRINCIPAL",
      );
    }
    if (
      ambito.responsableAuxiliarId &&
      ambito.responsableAuxiliarId !== ambito.responsablePrincipalId
    ) {
      roles.set(ambito.responsableAuxiliarId, "AUXILIAR");
    }
    ambito.responsables = [...ids]
      .map((id) => ({
        usuario_id: id,
        nombre_responsable: nombres.get(id) ?? "Responsable no disponible",
        tipo_responsabilidad:
          roles.get(id) ??
          (id === ambito.responsablePrincipalId
            ? ambito.tipo_congregacion === "PAIS"
              ? "OBRERO_PAIS"
              : "PRINCIPAL"
            : "AUXILIAR"),
      }))
      .sort((a, b) => {
        const prioridad = (tipo: string) =>
          tipo === "OBRERO_PAIS" || tipo === "PRINCIPAL" ? 0 : tipo === "AUXILIAR" ? 1 : 2;
        return prioridad(a.tipo_responsabilidad) - prioridad(b.tipo_responsabilidad);
      });
  }
};
