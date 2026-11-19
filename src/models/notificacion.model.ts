import { DataTypes } from "sequelize";
import db from "../database/connection";

export const CATEGORIAS_NOTIFICACION = [
  "INFORMATIVA",
  "PENDIENTE",
  "ADMINISTRATIVA",
  "SOLICITUD",
] as const;

export type CategoriaNotificacion = (typeof CATEGORIAS_NOTIFICACION)[number];

/** Tabla `notificacion` (migración 017). */
const Notificacion = db.define(
  "Notificacion",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.STRING(50), allowNull: false },
    categoria: { type: DataTypes.ENUM(...CATEGORIAS_NOTIFICACION), allowNull: false },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    mensaje: { type: DataTypes.STRING(500), allowNull: false },
    entidad_tipo: { type: DataTypes.STRING(30), allowNull: true },
    entidad_id: { type: DataTypes.INTEGER, allowNull: true },
    url_destino: { type: DataTypes.STRING(255), allowNull: true },
    clave_evento: { type: DataTypes.STRING(191), allowNull: false },
    leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    fecha_lectura: { type: DataTypes.DATE, allowNull: true },
    fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fecha_expiracion: { type: DataTypes.DATE, allowNull: true },
  },
  {
    freezeTableName: true,
    tableName: "notificacion",
    timestamps: false,
  },
);

export default Notificacion;
