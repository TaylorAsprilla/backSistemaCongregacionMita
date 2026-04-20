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
import { Op, Transaction, UniqueConstraintError } from "sequelize";
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
  idUsuario?: number;
  idCongregacion?: number;
  tipoEntidad: "usuario" | "congregacion";
  sessionType?: "NORMAL" | "QR";
  isLoginCodeQr?: boolean;
  qrCode?: string;
  ip: string;
  userAgent: string;
  expiresAt: Date;
  refreshToken?: string;
}

interface SessionValidationResult {
  isValid: boolean;
  session?: any;
  sessionType?: "NORMAL" | "QR";
  isLoginCodeQr?: boolean;
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
 * Invalida todas las sesiones activas de un usuario o congregación
 *
 * @param idUsuario - ID del usuario cuyas sesiones se invalidarán
 * @param idCongregacion - ID de la congregación cuyas sesiones se invalidarán
 * @param reason - Razón de invalidación (opcional)
 * @param transaction - Transacción de Sequelize para atomicidad
 */
export const invalidateAllUserSessions = async (
  idUsuario?: number,
  idCongregacion?: number,
  reason: string = "NEW_LOGIN",
  transaction?: any,
): Promise<void> => {
  try {
    const whereClause: any = {
      isActive: true,
      // Solo invalidar sesiones NORMALES; las sesiones QR se gestionan de forma independiente
      sessionType: "NORMAL",
    };

    if (idUsuario) {
      whereClause.idUsuario = idUsuario;
    } else if (idCongregacion) {
      whereClause.idCongregacion = idCongregacion;
    } else {
      throw new Error("Se debe proporcionar idUsuario o idCongregacion");
    }

    await UserSession.update(
      {
        isActive: false,
        invalidationReason: reason,
        invalidatedAt: new Date(),
      },
      {
        where: whereClause,
        transaction,
      },
    );
  } catch (error) {
    console.error(
      `Error al invalidar sesiones ${idUsuario ? `del usuario ${idUsuario}` : `de la congregación ${idCongregacion}`}:`,
      error,
    );
    throw new Error("Error al invalidar sesiones anteriores");
  }
};

/**
 * Crea una nueva sesión para un usuario o congregación
 *
 * IMPORTANTE: Esta función invalida automáticamente las sesiones NORMAL
 * activas anteriores antes de crear la nueva sesión.
 *
 * Garantías multi-instancia:
 *   1. Transacción con aislamiento SERIALIZABLE.
 *   2. SELECT FOR UPDATE bloquea las filas de la entidad hasta el commit,
 *      serializando requests concurrentes en el mismo usuario.
 *   3. El unique index en la columna generada `_normalUserGuard` /
 *      `_normalCongGuard` actúa como última línea de defensa a nivel DB.
 *
 * @param params - Parámetros para crear la sesión
 * @returns Objeto con sessionId generado y datos de la sesión
 */
export const createUserSession = async (
  params: CreateSessionParams,
): Promise<{ sessionId: string; session: any }> => {
  const {
    idUsuario,
    idCongregacion,
    tipoEntidad,
    sessionType = "NORMAL",
    isLoginCodeQr = false,
    qrCode,
    ip,
    userAgent,
    expiresAt,
    refreshToken,
  } = params;

  if (tipoEntidad === "usuario" && !idUsuario) {
    throw new Error("Se debe proporcionar idUsuario para sesiones de usuario");
  }
  if (tipoEntidad === "congregacion" && !idCongregacion) {
    throw new Error(
      "Se debe proporcionar idCongregacion para sesiones de congregación",
    );
  }

  // Preparar datos de dispositivo y ubicación ANTES de abrir la transacción
  // para no mantener el lock mientras esperamos respuestas de red externas.
  const deviceInfo = parseDeviceInfo(userAgent);
  const locationInfo = await getLocationFromIP(ip);

  // Transacción SERIALIZABLE: garantiza que dos logins concurrentes del mismo
  // usuario no generen dos sesiones NORMAL activas en entornos multi-instancia.
  const transaction = await db.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    // 1. Bloquear filas NORMAL activas de la entidad (SELECT FOR UPDATE).
    //    Si otra transacción concurrente ya las bloqueó, esta espera hasta
    //    que aquella haga commit/rollback, serializando el acceso.
    const lockWhere: any = {
      isActive: true,
      sessionType: "NORMAL",
    };
    if (idUsuario) lockWhere.idUsuario = idUsuario;
    else lockWhere.idCongregacion = idCongregacion;

    await UserSession.findAll({
      where: lockWhere,
      attributes: ["id", "sessionId"],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    // 2. Invalidar sesiones NORMAL activas anteriores de la entidad
    await invalidateAllUserSessions(
      idUsuario,
      idCongregacion,
      "NEW_LOGIN",
      transaction,
    );

    // 3. Generar nuevo sessionId único
    const sessionId = uuidv4();

    console.log(
      `Ubicación detectada para ${tipoEntidad} ${idUsuario || idCongregacion}:`,
      {
        pais: locationInfo.pais,
        ciudad: locationInfo.ciudad,
        ip,
      },
    );

    // 4. Crear nueva sesión activa dentro de la transacción
    const newSession = await UserSession.create(
      {
        tipoEntidad,
        sessionType,
        isLoginCodeQr,
        qrCode: qrCode || null,
        idUsuario: tipoEntidad === "usuario" ? idUsuario : null,
        idCongregacion: tipoEntidad === "congregacion" ? idCongregacion : null,
        sessionId,
        refreshToken: refreshToken || null,
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

    // 5. Commit — libera el bloqueo FOR UPDATE
    await transaction.commit();

    const entidadId = idUsuario || idCongregacion;
    console.info(
      `Sesión NORMAL creada para ${tipoEntidad} ${entidadId}. SessionId: ${sessionId}, Ubicación: ${locationInfo.ciudad}, ${locationInfo.pais}`,
    );

    return { sessionId, session: newSession };
  } catch (error) {
    await transaction.rollback();

    // Error específico: el índice único detectó una sesión NORMAL duplicada.
    // Esto solo ocurre como salvaguarda extrema (dos requests exactamente
    // simultáneos que pasaron la barrera FOR UPDATE).
    if (error instanceof UniqueConstraintError) {
      console.warn(
        `Conflicto de sesión única NORMAL para ${tipoEntidad} ${idUsuario || idCongregacion} — reintentando...`,
      );
      // Reintento simple: llamar de forma recursiva una vez más.
      // En el reintento, la sesión del request ganador ya está visible
      // y será invalidada correctamente por SELECT FOR UPDATE.
      return createUserSession(params);
    }

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
 * - Que pertenezca a la entidad indicada (usuario o congregación)
 * - Que no haya expirado
 *
 * @param sessionId - Identificador único de sesión (del JWT)
 * @param idEntidad - ID del usuario o congregación (del JWT)
 * @returns Resultado de validación con detalles
 */
export const validateUserSession = async (
  sessionId: string,
  idEntidad: number,
): Promise<SessionValidationResult> => {
  try {
    // Buscar la sesión en base de datos solo por sessionId primero
    const session = await UserSession.findOne({
      where: {
        sessionId,
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

    // Caso 1.5: Verificar que la sesión pertenece a la entidad correcta
    const sessionUserId = session.getDataValue("idUsuario");
    const sessionCongregacionId = session.getDataValue("idCongregacion");
    const belongsToEntity =
      sessionUserId === idEntidad || sessionCongregacionId === idEntidad;

    if (!belongsToEntity) {
      return {
        isValid: false,
        error: "La sesión no pertenece a esta entidad",
        code: "SESSION_NOT_FOUND",
      };
    }

    // Caso 2: Sesión invalidada (posiblemente por nuevo login)
    if (!session.getDataValue("isActive")) {
      const reason = session.getDataValue("invalidationReason");
      const tipoEntidad = session.getDataValue("tipoEntidad");

      // Si la sesión fue reemplazada por un nuevo login, obtener información de la nueva sesión
      if (reason === "NEW_LOGIN") {
        try {
          const whereClause: any = {
            isActive: true,
          };

          // Buscar la nueva sesión de la misma entidad
          if (tipoEntidad === "usuario") {
            whereClause.idUsuario = idEntidad;
          } else {
            whereClause.idCongregacion = idEntidad;
          }

          const newSession = await UserSession.findOne({
            where: whereClause,
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
      sessionType: session.getDataValue("sessionType") || "NORMAL",
      isLoginCodeQr: session.getDataValue("isLoginCodeQr") || false,
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
 * Crea una sesión de tipo QR sin invalidar otras sesiones activas.
 *
 * A diferencia de createUserSession, esta función:
 * - NO invalida sesiones previas (ni NORMAL ni QR)
 * - Permite múltiples sesiones simultáneas para el mismo QR
 * - Registra sessionType = 'QR' e isLoginCodeQr = true
 *
 * @param params - Parámetros de la sesión (mismo tipo que createUserSession)
 * @returns Objeto con sessionId generado y datos de la sesión
 */
export const createQrSession = async (
  params: CreateSessionParams,
): Promise<{ sessionId: string; session: any }> => {
  const {
    idUsuario,
    idCongregacion,
    tipoEntidad,
    qrCode,
    ip,
    userAgent,
    expiresAt,
    refreshToken,
  } = params;

  if (tipoEntidad === "usuario" && !idUsuario) {
    throw new Error("Se debe proporcionar idUsuario para sesiones de usuario");
  }
  if (tipoEntidad === "congregacion" && !idCongregacion) {
    throw new Error(
      "Se debe proporcionar idCongregacion para sesiones de congregación",
    );
  }

  const sessionId = uuidv4();
  const deviceInfo = parseDeviceInfo(userAgent);
  const locationInfo = await getLocationFromIP(ip);

  const newSession = await UserSession.create({
    tipoEntidad,
    sessionType: "QR",
    isLoginCodeQr: true,
    qrCode: qrCode || null,
    idUsuario: idUsuario || null,
    idCongregacion: tipoEntidad === "congregacion" ? idCongregacion : null,
    sessionId,
    refreshToken: refreshToken || null,
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
  });

  const entidadId = idUsuario || idCongregacion;
  console.info(
    `Sesión QR creada para ${tipoEntidad} ${entidadId}. SessionId: ${sessionId}, QR: ${qrCode}, Ubicación: ${locationInfo.ciudad}, ${locationInfo.pais}`,
  );

  return { sessionId, session: newSession };
};

/**
 * Invalida una sesión específica (para logout)
 *
 * @param sessionId - Identificador de la sesión a invalidar
 * @param idEntidad - ID del usuario o congregación (para validación)
 * @returns true si se invalidó correctamente
 */
export const invalidateSession = async (
  sessionId: string,
  idEntidad: number,
): Promise<boolean> => {
  try {
    // Primero buscar la sesión para verificar que pertenece a la entidad
    const session = await UserSession.findOne({
      where: {
        sessionId,
        isActive: true,
      },
    });

    if (!session) {
      return false;
    }

    // Verificar que pertenece a la entidad correcta
    const sessionUserId = session.getDataValue("idUsuario");
    const sessionCongregacionId = session.getDataValue("idCongregacion");
    const belongsToEntity =
      sessionUserId === idEntidad || sessionCongregacionId === idEntidad;

    if (!belongsToEntity) {
      return false;
    }

    // Invalidar la sesión
    const result = await UserSession.update(
      {
        isActive: false,
        invalidationReason: "LOGOUT",
        invalidatedAt: new Date(),
      },
      {
        where: {
          sessionId,
          isActive: true,
        },
      },
    );

    const rowsAffected = result[0];

    if (rowsAffected > 0) {
      console.info(
        `Sesión ${sessionId} invalidada por logout de la entidad ${idEntidad}`,
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
 * - Todas las sesiones activas (isActive = true y no expiradas)
 * - Sesiones inactivas de las últimas 48 horas (para historial reciente)
 *
 * @returns Objeto con estadísticas y lista de sesiones activas
 */
export const getActiveSessionsWithUserInfo = async (
  limit: number = 100,
  offset: number = 0,
): Promise<any> => {
  try {
    const now = new Date();

    // Calcular fecha límite: hace 48 horas
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const activeSessions = await UserSession.findAll({
      limit: limit, // Limitar resultados
      offset: offset, // Paginación
      where: {
        [Op.or]: [
          // Condición 1: Sesiones activas (sin importar cuándo se crearon)
          {
            isActive: true,
            expiresAt: {
              [Op.gt]: now,
            },
          },
          // Condición 2: Sesiones inactivas de las últimas 48 horas
          {
            isActive: false,
            createdAt: {
              [Op.gte]: fortyEightHoursAgo,
            },
          },
        ],
      },
      attributes: [
        "id",
        "sessionId",
        "tipoEntidad",
        "sessionType",
        "isLoginCodeQr",
        "qrCode",
        "idUsuario",
        "idCongregacion",
        "isActive",
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
        "invalidationReason",
        "invalidatedAt",
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
        {
          model: Congregacion,
          as: "congregacion",
          attributes: ["id", "congregacion", "email", "pais_id"],
          required: false,
          include: [
            {
              model: Pais,
              as: "pais",
              attributes: ["id", "pais"],
              required: false,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalActiveSessions = activeSessions.length;

    const sessionsWithUserInfo = activeSessions.map((session) => {
      const sessionData = session.toJSON();
      const tipoEntidad = sessionData.tipoEntidad;
      const usuario = sessionData.usuario;
      const congregacion = sessionData.congregacion;

      // Determinar el estado de la sesión
      const now = new Date();
      const isExpired = new Date(sessionData.expiresAt) <= now;
      const isCurrentlyActive = sessionData.isActive && !isExpired;

      // Información base de la entidad
      let entidadInfo: any = {};

      if (tipoEntidad === "usuario" && usuario) {
        // Construir nombre completo desde los campos correctos
        const primerNombre = usuario.primerNombre || "";
        const segundoNombre = usuario.segundoNombre || "";
        const primerApellido = usuario.primerApellido || "";
        const segundoApellido = usuario.segundoApellido || "";

        const nombreCompleto =
          `${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}`
            .replace(/\s+/g, " ")
            .trim();

        // Obtener información de congregación del usuario
        const usuarioCongregacion = usuario.usuarioCongregacion;
        const paisObj = usuarioCongregacion?.pais;
        const congregacionObj = usuarioCongregacion?.congregacion;
        const campoObj = usuarioCongregacion?.campo;

        entidadInfo = {
          tipo: "usuario",
          id: usuario.id,
          primerNombre: primerNombre || "N/A",
          segundoNombre: segundoNombre || "N/A",
          primerApellido: primerApellido || "N/A",
          segundoApellido: segundoApellido || "N/A",
          nombreCompleto: nombreCompleto || "N/A",
          login: usuario.login || "N/A",
          email: usuario.email || "N/A",
          congregacion: {
            pais: paisObj?.pais || "N/A",
            nombre: congregacionObj?.congregacion || "N/A",
            campo: campoObj?.campo || "N/A",
          },
        };
      } else if (tipoEntidad === "congregacion" && congregacion) {
        // Información de la congregación
        // En congregaciones, el email funciona como login
        const paisObj = congregacion.pais;

        entidadInfo = {
          tipo: "congregacion",
          id: congregacion.id,
          nombre: congregacion.congregacion || "N/A",
          login: congregacion.email || "N/A", // El email es el login
          email: congregacion.email || "N/A",
          pais: paisObj?.pais || "N/A",
        };
      } else {
        // Entidad no encontrada o tipo desconocido
        entidadInfo = {
          tipo: tipoEntidad || "desconocido",
          id: null,
          nombre: "N/A",
          login: "N/A",
          email: "N/A",
        };
      }

      return {
        sessionId: sessionData.sessionId,
        sessionType: sessionData.sessionType || "NORMAL",
        isLoginCodeQr: sessionData.isLoginCodeQr || false,
        qrCode: sessionData.qrCode || null,
        isActive: sessionData.isActive,
        isCurrentlyActive: isCurrentlyActive,
        isExpired: isExpired,
        invalidationReason: sessionData.invalidationReason || null,
        entidad: entidadInfo,
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
          invalidatedAt: sessionData.invalidatedAt || null,
        },
      };
    });

    // Contar sesiones realmente activas
    const currentlyActiveSessions = sessionsWithUserInfo.filter(
      (s) => s.isCurrentlyActive,
    ).length;

    // Contar por tipo de sesión (solo activas)
    const activeNormalSessions = sessionsWithUserInfo.filter(
      (s) => s.isCurrentlyActive && s.sessionType === "NORMAL",
    ).length;
    const activeQrSessions = sessionsWithUserInfo.filter(
      (s) => s.isCurrentlyActive && s.sessionType === "QR",
    ).length;

    return {
      totalSessions: totalActiveSessions,
      currentlyActiveSessions: currentlyActiveSessions,
      activeNormalSessions,
      activeQrSessions,
      inactiveSessions: totalActiveSessions - currentlyActiveSessions,
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

/**
 * Obtiene las sesiones activas de una entidad específica (usuario o congregación)
 *
 * @param idUsuario - ID del usuario (opcional)
 * @param idCongregacion - ID de la congregación (opcional)
 * @returns Array de sesiones activas con información detallada
 */
export const getActiveSessionsByEntity = async (
  idUsuario?: number,
  idCongregacion?: number,
): Promise<any[]> => {
  try {
    const whereClause: any = {
      isActive: true,
    };

    if (idUsuario) {
      whereClause.idUsuario = idUsuario;
    } else if (idCongregacion) {
      whereClause.idCongregacion = idCongregacion;
    } else {
      throw new Error("Se debe proporcionar idUsuario o idCongregacion");
    }

    const sessions = await UserSession.findAll({
      where: whereClause,
      attributes: [
        "sessionId",
        "sessionType",
        "isLoginCodeQr",
        "qrCode",
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
      order: [["createdAt", "DESC"]],
    });

    return sessions.map((session) => {
      const data = session.toJSON();
      return {
        sessionId: data.sessionId,
        sessionType: data.sessionType || "NORMAL",
        isLoginCodeQr: data.isLoginCodeQr || false,
        qrCode: data.qrCode || null,
        device: {
          tipoDispositivo: data.tipoDispositivo || "desktop",
          navegador: data.navegador || "Desconocido",
          so: data.so || "Desconocido",
          dispositivo: data.dispositivo || "Desconocido",
        },
        sessionLocation: {
          ciudad: data.ciudad || "Desconocida",
          pais: data.pais || "Desconocido",
          region: data.region,
        },
        network: {
          ip: data.ip,
          isp: data.isp,
        },
        timestamps: {
          createdAt: data.createdAt,
          lastActivityAt: data.lastActivityAt,
          expiresAt: data.expiresAt,
        },
      };
    });
  } catch (error) {
    console.error("Error al obtener sesiones activas de la entidad:", error);
    throw new Error("Error al obtener sesiones activas");
  }
};

export default {
  createUserSession,
  createQrSession,
  validateUserSession,
  invalidateSession,
  invalidateAllUserSessions,
  getUserSessions,
  parseDeviceInfo,
  cleanExpiredSessions,
  getActiveSessionsWithUserInfo,
  getLocationFromIP,
  getActiveSessionsByEntity,
};
