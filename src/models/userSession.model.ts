import { DataTypes } from "sequelize";
import db from "../database/connection";
import Usuario from "./usuario.model";
import Congregacion from "./congregacion.model";

/**
 * Modelo UserSession
 *
 * Gestiona las sesiones activas de usuarios y congregaciones para implementar
 * una política de sesión única por entidad.
 *
 * Solo puede haber una sesión activa por usuario/congregación a la vez.
 * Cuando una entidad inicia sesión desde un nuevo dispositivo,
 * todas las sesiones anteriores son invalidadas automáticamente.
 */
const UserSession = db.define(
  "UserSession",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Tipo de entidad: 'usuario' o 'congregacion'
    tipoEntidad: {
      type: DataTypes.ENUM("usuario", "congregacion"),
      allowNull: false,
      defaultValue: "usuario",
      field: "tipoEntidad",
    },
    // Tipo de sesión: NORMAL (usuario/contraseña) o QR (código QR)
    sessionType: {
      type: DataTypes.ENUM("NORMAL", "QR"),
      allowNull: false,
      defaultValue: "NORMAL",
      field: "sessionType",
      comment: "NORMAL = login con credenciales, QR = login por código QR",
    },
    // Indica si la sesión fue creada mediante login por QR
    isLoginCodeQr: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "isLoginCodeQr",
    },
    // Código QR utilizado (solo aplica cuando sessionType = 'QR')
    qrCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: "qrCode",
    },
    // ID del usuario al que pertenece la sesión (nullable para congregaciones)
    idUsuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "usuario",
        key: "id",
      },
      field: "idUsuario",
    },
    // ID de la congregación al que pertenece la sesión (nullable para usuarios)
    idCongregacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "congregacion",
        key: "id",
      },
      field: "idCongregacion",
    },
    // Identificador único de la sesión (JWT ID - jti claim)
    // Se incluye en el payload del JWT para validación
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      field: "sessionId",
    },
    // Refresh token (opcional, para futuras implementaciones)
    refreshToken: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "refreshToken",
    },
    // IP desde donde se inició la sesión
    ip: {
      type: DataTypes.STRING(45), // IPv6 puede ser hasta 45 caracteres
      allowNull: false,
    },
    // User Agent completo del navegador/dispositivo
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "userAgent",
    },
    // Información parseada del dispositivo
    navegador: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    so: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tipoDispositivo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "tipoDispositivo",
    },
    dispositivo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Información de ubicación geográfica
    pais: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    codigoPostal: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "codigoPostal",
    },
    latitud: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitud: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    isp: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: "Proveedor de Internet",
    },
    // Bandera para indicar si la sesión está activa
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "isActive",
    },
    // ---- Columnas generadas VIRTUAL (migración 003) ----
    // Garantizan unicidad de sesiones NORMAL activas a nivel de base de datos.
    // Retornan el idUsuario/idCongregacion solo para sesiones NORMAL+isActive=1;
    // para QR o inactivas retornan NULL → MySQL permite múltiples NULLs.
    // Sequelize las declara como VIRTUAL para que no intente escribir en ellas.
    _normalUserGuard: {
      type: DataTypes.VIRTUAL,
      allowNull: true,
      field: "_normalUserGuard",
    },
    _normalCongGuard: {
      type: DataTypes.VIRTUAL,
      allowNull: true,
      field: "_normalCongGuard",
    },
    // Fecha de última actividad (actualizada en cada request)
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "lastActivityAt",
    },
    // Fecha de expiración del token JWT
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expiresAt",
    },
    // Razón de invalidación (logout, nueva sesión, expiración, etc.)
    invalidationReason: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "invalidationReason",
    },
    // Fecha de invalidación
    invalidatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "invalidatedAt",
    },
  },
  {
    freezeTableName: true,
    tableName: "userSession",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    indexes: [
      {
        name: "idx_user_session_userId",
        fields: ["idUsuario"],
      },
      {
        name: "idx_user_session_congregacionId",
        fields: ["idCongregacion"],
      },
      {
        name: "idx_user_session_sessionId",
        unique: true,
        fields: ["sessionId"],
      },
      {
        name: "idx_user_session_active_usuario",
        fields: ["idUsuario", "isActive"],
      },
      {
        name: "idx_user_session_active_congregacion",
        fields: ["idCongregacion", "isActive"],
      },
      {
        name: "idx_user_session_tipo_entidad",
        fields: ["tipoEntidad", "isActive"],
      },
      {
        name: "idx_user_session_type_active",
        fields: ["sessionType", "isActive"],
      },
      {
        name: "uq_active_normal_session_user",
        unique: true,
        fields: ["_normalUserGuard"],
      },
      {
        name: "uq_active_normal_session_cong",
        unique: true,
        fields: ["_normalCongGuard"],
      },
    ],
  },
);

// Asociación con Usuario
UserSession.belongsTo(Usuario, {
  foreignKey: "idUsuario",
  as: "usuario",
});

// Asociación con Congregación
UserSession.belongsTo(Congregacion, {
  foreignKey: "idCongregacion",
  as: "congregacion",
});

export default UserSession;
