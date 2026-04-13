import { v4 as uuidv4 } from "uuid";
import DeviceDetector from "device-detector-js";
import { BrowserResult } from "device-detector-js/dist/parsers/client/browser";
import UserSession from "../models/userSession.model";
import Usuario from "../models/usuario.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import Congregacion from "../models/congregacion.model";
import Pais from "../models/pais.model";
import Campo from "../models/campo.model";
import db from "../database/connection";
import { Op } from "sequelize";
import axios from "axios";

/**
 * Servicio de gestión de sesiones de usuario
 *
 * Implementa una política de sesión única por usuario.
 * Solo puede haber una sesión activa por usuario a la vez.
 */

interface DeviceInfo {
  navegador?: string;
  so?: string;
  tipoDispositivo?: string;
  dispositivo?: string;
}

interface LocationInfo {
  pais?: string;
  ciudad?: string;
  region?: string;
  codigoPostal?: string;
  latitud?: number;
  longitud?: number;
  isp?: string;
}

interface CreateSessionParams {
  idUsuario: number;
  ip: string;
  userAgent: string;
  expiresAt: Date;
  refreshToken?: string;
}

interface SessionValidationResult {
  isValid: boolean;
  session?: any;
  error?: string;
  code?: string;
  newSessionInfo?: {
    location: {
      pais?: string;
      ciudad?: string;
      region?: string;
    };
    device: {
      navegador?: string;
      so?: string;
      dispositivo?: string;
      tipoDispositivo?: string;
    };
    ip?: string;
    isp?: string;
    createdAt?: Date;
  };
}

/**
 * Extrae información del dispositivo desde el User Agent
 */
export const parseDeviceInfo = (userAgent: string): DeviceInfo => {
  try {
    const deviceDetector = new DeviceDetector();
    const deviceResult = deviceDetector.parse(userAgent);

    return {
      navegador: deviceResult.client?.name || "Desconocido",
      so: deviceResult.os?.name || "Desconocido",
      tipoDispositivo: deviceResult.device?.type || "desktop",
      dispositivo: deviceResult.device?.model || "Desconocido",
    };
  } catch (error) {
    console.error("Error al parsear dispositivo:", error);
    return {
      navegador: "Desconocido",
      so: "Desconocido",
      tipoDispositivo: "desktop",
      dispositivo: "Desconocido",
    };
  }
};

/**
 * Obtiene información de ubicación geográfica desde la IP
 * Usa el servicio IP-API para geolocalización
 */
export const getLocationFromIP = async (ip: string): Promise<LocationInfo> => {
  try {
    // Ignorar IPs locales/privadas
    if (
      !ip ||
      ip === "::1" ||
      ip.startsWith("127.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.")
    ) {
      console.log(`IP local detectada (${ip}), no se obtendrá ubicación`);
      return {
        pais: "Local",
        ciudad: "Local",
        region: "Local",
        codigoPostal: undefined,
        latitud: undefined,
        longitud: undefined,
        isp: "Red Local",
      };
    }

    const apiUrl = process.env.IP_API || "http://ip-api.com/json";

    console.log(`Obteniendo ubicación para IP: ${ip}`);

    const response = await axios.get(`${apiUrl}/${ip}`, {
      params: {
        fields: "status,message,country,regionName,city,zip,lat,lon,isp",
      },
      timeout: 5000, // 5 segundos timeout
    });

    const data = response.data;

    if (data.status === "fail") {
      console.error(`Error en IP-API: ${data.message}`);
      return {};
    }

    console.log(`Ubicación obtenida: ${data.city}, ${data.country}`);

    return {
      pais: data.country || null,
      ciudad: data.city || null,
      region: data.regionName || null,
      codigoPostal: data.zip || null,
      latitud: data.lat || null,
      longitud: data.lon || null,
      isp: data.isp || null,
    };
  } catch (error) {
    console.error("Error al obtener ubicación desde IP:", error);
    // Retornar objeto vacío en caso de error, no bloquear el login
    return {};
  }
};

/**
 * Invalida todas las sesiones activas de un usuario
 *
 * @param idUsuario - ID del usuario cuyas sesiones se invalidarán
 * @param reason - Razón de invalidación (opcional)
 * @param transaction - Transacción de Sequelize para atomicidad
 */
export const invalidateAllUserSessions = async (
  idUsuario: number,
  reason: string = "NEW_LOGIN",
  transaction?: any,
): Promise<void> => {
  try {
    await UserSession.update(
      {
        isActive: false,
        invalidationReason: reason,
        invalidatedAt: new Date(),
      },
      {
        where: {
          idUsuario,
          isActive: true,
        },
        transaction,
      },
    );
  } catch (error) {
    console.error(
      `Error al invalidar sesiones del usuario ${idUsuario}:`,
      error,
    );
    throw new Error("Error al invalidar sesiones anteriores");
  }
};

/**
 * Crea una nueva sesión para un usuario
 *
 * IMPORTANTE: Esta función invalida automáticamente todas las sesiones
 * activas anteriores del usuario antes de crear la nueva sesión.
 *
 * @param params - Parámetros para crear la sesión
 * @returns Objeto con sessionId generado y datos de la sesión
 */
export const createUserSession = async (
  params: CreateSessionParams,
): Promise<{ sessionId: string; session: any }> => {
  const { idUsuario, ip, userAgent, expiresAt, refreshToken } = params;

  // Usar transacción para garantizar atomicidad
  const transaction = await db.transaction();

  try {
    // 1. Invalidar todas las sesiones activas anteriores del usuario
    await invalidateAllUserSessions(idUsuario, "NEW_LOGIN", transaction);

    // 2. Generar nuevo sessionId único
    const sessionId = uuidv4();

    // 3. Parsear información del dispositivo
    const deviceInfo = parseDeviceInfo(userAgent);

    // 4. Obtener ubicación geográfica desde la IP
    const locationInfo = await getLocationFromIP(ip);
    console.log(`Ubicación detectada para usuario ${idUsuario}:`, {
      pais: locationInfo.pais,
      ciudad: locationInfo.ciudad,
      ip: ip,
    });

    // 5. Crear nueva sesión activa
    const newSession = await UserSession.create(
      {
        idUsuario,
        sessionId,
        refreshToken,
        ip,
        userAgent,
        navegador: deviceInfo.navegador,
        so: deviceInfo.so,
        tipoDispositivo: deviceInfo.tipoDispositivo,
        dispositivo: deviceInfo.dispositivo,
        pais: locationInfo.pais,
        ciudad: locationInfo.ciudad,
        region: locationInfo.region,
        codigoPostal: locationInfo.codigoPostal,
        latitud: locationInfo.latitud,
        longitud: locationInfo.longitud,
        isp: locationInfo.isp,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt,
      },
      { transaction },
    );

    // 6. Commit de la transacción
    await transaction.commit();

    console.info(
      `Nueva sesión creada para usuario ${idUsuario}. SessionId: ${sessionId}, Ubicación: ${locationInfo.ciudad}, ${locationInfo.pais}`,
    );

    return {
      sessionId,
      session: newSession,
    };
  } catch (error) {
    // Rollback en caso de error
    await transaction.rollback();
    console.error("Error al crear sesión de usuario:", error);
    throw new Error("Error al crear sesión de usuario");
  }
};

/**
 * Valida si una sesión es válida y está activa
 *
 * Verifica:
 * - Que la sesión exista
 * - Que esté marcada como activa
 * - Que pertenezca al usuario indicado
 * - Que no haya expirado
 *
 * @param sessionId - Identificador único de sesión (del JWT)
 * @param idUsuario - ID del usuario (del JWT)
 * @returns Resultado de validación con detalles
 */
export const validateUserSession = async (
  sessionId: string,
  idUsuario: number,
): Promise<SessionValidationResult> => {
  try {
    // Buscar la sesión en base de datos
    const session = await UserSession.findOne({
      where: {
        sessionId,
        idUsuario,
      },
    });

    // Caso 1: Sesión no encontrada
    if (!session) {
      return {
        isValid: false,
        error: "Sesión no encontrada",
        code: "SESSION_NOT_FOUND",
      };
    }

    // Caso 2: Sesión invalidada (posiblemente por nuevo login)
    if (!session.getDataValue("isActive")) {
      const reason = session.getDataValue("invalidationReason");

      // Si la sesión fue reemplazada por un nuevo login, obtener información de la nueva sesión
      if (reason === "NEW_LOGIN") {
        try {
          const newSession = await UserSession.findOne({
            where: {
              idUsuario,
              isActive: true,
            },
            attributes: [
              "navegador",
              "so",
              "dispositivo",
              "tipoDispositivo",
              "pais",
              "ciudad",
              "region",
              "ip",
              "isp",
              "createdAt",
            ],
            order: [["createdAt", "DESC"]],
          });

          if (newSession) {
            const ciudad = newSession.getDataValue("ciudad") || "Desconocida";
            const pais = newSession.getDataValue("pais") || "Desconocido";
            const dispositivo =
              newSession.getDataValue("dispositivo") || "Desconocido";
            const navegador =
              newSession.getDataValue("navegador") || "Desconocido";
            const so = newSession.getDataValue("so") || "Desconocido";

            return {
              isValid: false,
              error: `Tu sesión fue cerrada porque se inició sesión desde ${ciudad}, ${pais} usando ${navegador} en ${so}`,
              code: "SESSION_REPLACED",
              session,
              newSessionInfo: {
                location: {
                  pais: newSession.getDataValue("pais"),
                  ciudad: newSession.getDataValue("ciudad"),
                  region: newSession.getDataValue("region"),
                },
                device: {
                  navegador: newSession.getDataValue("navegador"),
                  so: newSession.getDataValue("so"),
                  dispositivo: newSession.getDataValue("dispositivo"),
                  tipoDispositivo: newSession.getDataValue("tipoDispositivo"),
                },
                ip: newSession.getDataValue("ip"),
                isp: newSession.getDataValue("isp"),
                createdAt: newSession.getDataValue("createdAt"),
              },
            };
          }
        } catch (error) {
          console.error(
            "Error al obtener información de la nueva sesión:",
            error,
          );
        }

        // Fallback si no se pudo obtener la nueva sesión
        return {
          isValid: false,
          error:
            "Tu sesión fue cerrada porque se inició sesión en otro dispositivo",
          code: "SESSION_REPLACED",
          session,
        };
      }

      // Otras razones de invalidación
      return {
        isValid: false,
        error: "Tu sesión ha sido invalidada",
        code: "SESSION_INVALIDATED",
        session,
      };
    }

    // Caso 3: Sesión expirada por tiempo
    const expiresAt = new Date(session.getDataValue("expiresAt"));
    if (expiresAt < new Date()) {
      // Marcar como inactiva
      await session.update({
        isActive: false,
        invalidationReason: "EXPIRED",
        invalidatedAt: new Date(),
      });

      return {
        isValid: false,
        error: "La sesión ha expirado",
        code: "SESSION_EXPIRED",
        session,
      };
    }

    // Caso 4: Sesión válida - actualizar última actividad
    await session.update({
      lastActivityAt: new Date(),
    });

    return {
      isValid: true,
      session,
    };
  } catch (error) {
    console.error("Error al validar sesión:", error);
    return {
      isValid: false,
      error: "Error al validar sesión",
      code: "VALIDATION_ERROR",
    };
  }
};

/**
 * Invalida una sesión específica (para logout)
 *
 * @param sessionId - Identificador de la sesión a invalidar
 * @param idUsuario - ID del usuario (para validación)
 * @returns true si se invalidó correctamente
 */
export const invalidateSession = async (
  sessionId: string,
  idUsuario: number,
): Promise<boolean> => {
  try {
    const result = await UserSession.update(
      {
        isActive: false,
        invalidationReason: "LOGOUT",
        invalidatedAt: new Date(),
      },
      {
        where: {
          sessionId,
          idUsuario,
          isActive: true,
        },
      },
    );

    const rowsAffected = result[0];

    if (rowsAffected > 0) {
      console.info(
        `Sesión ${sessionId} invalidada por logout del usuario ${idUsuario}`,
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error al invalidar sesión:", error);
    throw new Error("Error al cerrar sesión");
  }
};

/**
 * Obtiene todas las sesiones de un usuario (activas e inactivas)
 * Útil para auditoría o panel de administración
 *
 * @param idUsuario - ID del usuario
 * @param onlyActive - Si es true, solo retorna sesiones activas
 */
export const getUserSessions = async (
  idUsuario: number,
  onlyActive: boolean = false,
): Promise<any[]> => {
  try {
    const whereClause: any = { idUsuario };

    if (onlyActive) {
      whereClause.isActive = true;
    }

    const sessions = await UserSession.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    return sessions;
  } catch (error) {
    console.error("Error al obtener sesiones del usuario:", error);
    return [];
  }
};

/**
 * Limpia sesiones expiradas de la base de datos
 * Puede ejecutarse como tarea programada (cron)
 *
 * @param daysOld - Número de días de antigüedad para eliminar
 */
export const cleanExpiredSessions = async (
  daysOld: number = 30,
): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await UserSession.destroy({
      where: {
        isActive: false,
        invalidatedAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    console.info(`Limpieza de sesiones: ${result} sesiones eliminadas`);
    return result;
  } catch (error) {
    console.error("Error al limpiar sesiones expiradas:", error);
    return 0;
  }
};

/**
 * Obtiene todas las sesiones activas con información del usuario y congregación
 *
 * Retorna:
 * - Total de sesiones activas
 * - Lista de sesiones con datos del usuario (nombre, apellidos)
 * - Información de congregación (país, ciudad, campo)
 * - Detalles de sesión (ubicación del login, dispositivo, IP)
 *
 * @returns Objeto con estadísticas y lista de sesiones activas
 */
export const getActiveSessionsWithUserInfo = async (): Promise<any> => {
  try {
    const activeSessions = await UserSession.findAll({
      where: {
        isActive: true,
      },
      attributes: [
        "id",
        "sessionId",
        "idUsuario",
        "navegador",
        "so",
        "dispositivo",
        "tipoDispositivo",
        "pais",
        "ciudad",
        "region",
        "ip",
        "isp",
        "createdAt",
        "lastActivityAt",
        "expiresAt",
      ],
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: [
            "id",
            "primerNombre",
            "segundoNombre",
            "primerApellido",
            "segundoApellido",
            "login",
            "email",
          ],
          required: false,
          include: [
            {
              model: UsuarioCongregacion,
              as: "usuarioCongregacion",
              attributes: [
                "usuario_id",
                "pais_id",
                "congregacion_id",
                "campo_id",
              ],
              required: false,
              include: [
                {
                  model: Pais,
                  as: "pais",
                  attributes: ["id", "pais"],
                  required: false,
                },
                {
                  model: Congregacion,
                  as: "congregacion",
                  attributes: ["id", "congregacion"],
                  required: false,
                },
                {
                  model: Campo,
                  as: "campo",
                  attributes: ["id", "campo"],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalActiveSessions = activeSessions.length;

    const sessionsWithUserInfo = activeSessions.map((session) => {
      const sessionData = session.toJSON();
      const usuario = sessionData.usuario;

      // Construir nombre completo desde los campos correctos
      const primerNombre = usuario?.primerNombre || "";
      const segundoNombre = usuario?.segundoNombre || "";
      const primerApellido = usuario?.primerApellido || "";
      const segundoApellido = usuario?.segundoApellido || "";

      const nombreCompleto = usuario
        ? `${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}`
            .replace(/\s+/g, " ")
            .trim()
        : "N/A";

      // Obtener información de congregación desde usuarioCongregacion
      const usuarioCongregacion = usuario?.usuarioCongregacion;
      const paisObj = usuarioCongregacion?.pais;
      const congregacionObj = usuarioCongregacion?.congregacion;
      const campoObj = usuarioCongregacion?.campo;

      return {
        sessionId: sessionData.sessionId,
        user: {
          id: usuario?.id || null,
          primerNombre: primerNombre || "N/A",
          segundoNombre: segundoNombre || "N/A",
          primerApellido: primerApellido || "N/A",
          segundoApellido: segundoApellido || "N/A",
          nombreCompleto: nombreCompleto,
          login: usuario?.login || "N/A",
          email: usuario?.email || "N/A",
        },
        congregacion: {
          pais: paisObj?.pais || "N/A",
          ciudad: congregacionObj?.congregacion || "N/A",
          campo: campoObj?.campo || "N/A",
        },
        sessionLocation: {
          pais: sessionData.pais || "N/A",
          ciudad: sessionData.ciudad || "N/A",
          region: sessionData.region || "N/A",
        },
        device: {
          navegador: sessionData.navegador || "N/A",
          so: sessionData.so || "N/A",
          dispositivo: sessionData.dispositivo || "N/A",
          tipoDispositivo: sessionData.tipoDispositivo || "desktop",
        },
        network: {
          ip: sessionData.ip || "N/A",
          isp: sessionData.isp || "N/A",
        },
        timestamps: {
          createdAt: sessionData.createdAt,
          lastActivityAt: sessionData.lastActivityAt,
          expiresAt: sessionData.expiresAt,
        },
      };
    });

    return {
      totalActiveSessions,
      sessions: sessionsWithUserInfo,
    };
  } catch (error) {
    console.error(
      "Error al obtener sesiones activas con información de usuario:",
      error,
    );
    throw new Error("Error al obtener sesiones activas");
  }
};

export default {
  createUserSession,
  validateUserSession,
  invalidateSession,
  invalidateAllUserSessions,
  getUserSessions,
  parseDeviceInfo,
  cleanExpiredSessions,
  getActiveSessionsWithUserInfo,
};
