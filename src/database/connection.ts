import { DataTypes, Model, Sequelize } from "sequelize";
import config from "../config/config";
import { informeAuditContext } from "../helpers/informeAuditContext";
require("dotenv").config();

const environment = config[process.env.NODE_ENV || "development"];

const sectionNames: Record<string, string> = {
  Actividad: "actividades",
  ActividadEspiritual: "aspectoEspiritual",
  ActividadEconomica: "actividadesEconomicas",
  AsuntoPendiente: "asuntosPendientes",
  Diezmos: "aspectoContable",
  Logro: "logros",
  Meta: "metas",
  SituacionVisita: "situacionVisitas",
  Visita: "visitas",
};

const esSeccionConAuditoria = (instance: Model) =>
  Boolean(sectionNames[(instance.constructor as typeof Model).name]);

const iniciarTransaccionAuditoria = async (
  instance: Model,
  options: any,
) => {
  if (!esSeccionConAuditoria(instance) || options.transaction) return;
  if (!instance.sequelize) {
    throw new Error("No hay conexión para guardar auditoría del informe.");
  }
  options.transaction = await instance.sequelize.transaction();
  options.__transaccionAuditoriaPropia = true;
};

const guardarAuditoriaEscrituraInforme = async (
  instance: Model,
  accion: "CREAR" | "ACTUALIZAR" | "ELIMINAR",
  options: any,
) => {
  const modelo = instance.constructor as typeof Model;
  const seccion = sectionNames[modelo.name];
  if (!seccion || modelo.name === "InformeAuditoria") return;
  const informeId = Number(instance.getDataValue("informe_id"));
  if (!Number.isInteger(informeId) || informeId <= 0) return;

  const sequelize = instance.sequelize;
  if (!sequelize) throw new Error("No hay conexión para guardar auditoría del informe.");
  const auditModel =
    sequelize.models.InformeAuditoria ??
    sequelize.define(
      "InformeAuditoria",
      {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        informe_id: { type: DataTypes.INTEGER, allowNull: false },
        seccion: { type: DataTypes.STRING(40), allowNull: false },
        registro_id: { type: DataTypes.INTEGER, allowNull: true },
        accion: { type: DataTypes.STRING(30), allowNull: false },
        usuario_id: { type: DataTypes.INTEGER, allowNull: true },
        cambios: { type: DataTypes.JSON, allowNull: true },
        fecha: { type: DataTypes.DATE, allowNull: false },
      } as any,
      { freezeTableName: true, tableName: "informeAuditoria", timestamps: false },
    );
  const cambios =
    accion === "ACTUALIZAR"
      ? Object.fromEntries(
          (instance.changed() || []).map((campo) => [
            campo,
            {
              anterior: instance.previous(campo),
              nuevo: instance.getDataValue(campo),
            },
          ]),
        )
      : instance.get({ plain: true });
  try {
    await auditModel.create(
      {
      informe_id: informeId,
      seccion,
      registro_id: Number(instance.getDataValue("id")) || null,
      accion,
      usuario_id: informeAuditContext.getStore() ?? null,
      cambios,
      fecha: new Date(),
      },
      options.transaction ? { transaction: options.transaction } : undefined,
    );
    if (
      options.__transaccionAuditoriaPropia &&
      options.__transaccionAuditoriaFinal !== false
    ) {
      await options.transaction.commit();
    }
  } catch (error) {
    if (options.__transaccionAuditoriaPropia) {
      await options.transaction.rollback();
    }
    throw error;
  }
};

const db = new Sequelize(
  environment.database.database,
  environment.database.username,
  environment.database.password,
  {
    host: environment.database.host,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 30,
      min: 0,
      acquire: 60000, // Tiempo máximo de espera para adquirir una conexión antes de lanzar un error (ms)
      idle: 10000, // Tiempo máximo que una conexión puede estar inactiva antes de ser liberada (ms)
    },
    define: {
      hooks: {
        beforeCreate: iniciarTransaccionAuditoria,
        beforeUpdate: iniciarTransaccionAuditoria,
        beforeDestroy: iniciarTransaccionAuditoria,
        beforeBulkCreate: async (instances: Model[], options: any) => {
          if (!instances.some(esSeccionConAuditoria) || options.transaction) return;
          const sequelize = instances[0].sequelize;
          if (!sequelize) {
            throw new Error("No hay conexión para guardar auditoría del informe.");
          }
          options.transaction = await sequelize.transaction();
          options.__transaccionAuditoriaPropia = true;
        },
        afterCreate: (instance: Model, options: any) =>
          guardarAuditoriaEscrituraInforme(instance, "CREAR", options),
        afterUpdate: (instance: Model, options: any) =>
          guardarAuditoriaEscrituraInforme(instance, "ACTUALIZAR", options),
        afterDestroy: (instance: Model, options: any) =>
          guardarAuditoriaEscrituraInforme(instance, "ELIMINAR", options),
        afterBulkCreate: async (instances: Model[], options: any) => {
          for (const [index, instance] of instances.entries()) {
            options.__transaccionAuditoriaFinal = index === instances.length - 1;
            await guardarAuditoriaEscrituraInforme(instance, "CREAR", options);
          }
          if (!instances.length && options.__transaccionAuditoriaPropia) {
            await options.transaction.commit();
          }
        },
      },
    },
  }
);

export default db;
