import { ROLES_ID } from "../enum/roles.enum";

/**
 * Configuración centralizada del Dashboard Ejecutivo de Supervisión Congregacional.
 *
 * Los umbrales describen la variación de un indicador; no califican congregaciones.
 *  - Incremento significativo:  >= +significativo
 *  - Incremento moderado:       >= +moderado y < +significativo
 *  - Sin variación significativa: > -moderado y < +moderado
 *  - Disminución moderada:      <= -moderado y > -significativo
 *  - Disminución significativa: <= -significativo
 */
export interface UmbralesVariacion {
  significativo: number;
  moderado: number;
}

export const DASHBOARD_SUPERVISION_CONFIG = {
  /** Permisos (tabla `permiso`) autorizados para consultar el dashboard y sus alertas. */
  rolesAutorizados: [ROLES_ID.ADMINISTRADOR] as string[],

  umbrales: {
    significativo: 10,
    moderado: 3,
  } as UmbralesVariacion,

  tendencia: {
    /** Cantidad mínima de variaciones consecutivas en la misma dirección. */
    periodosConsecutivos: 3,
    /**
     * Variación porcentual mínima (en valor absoluto) para que un paso cuente
     * dentro de una tendencia. 0 = cualquier disminución/incremento cuenta.
     */
    variacionMinima: 0,
  },

  /** Cantidad de trimestres (incluido el seleccionado) que se analizan en el histórico. */
  trimestresHistorico: 8,

  asuntosRecurrentes: {
    trimestresConsecutivos: 3,
  },

  /** Tiempo de vida (segundos) del cálculo en memoria compartido entre endpoints. */
  cacheSegundos: 60,

  paginacion: {
    porPaginaDefecto: 10,
    porPaginaMaximo: 100,
  },

  /** Palabras clave (sin tildes, minúsculas) para clasificar `tipoActividadEclesiastico.nombre`. */
  actividades: {
    palabrasServicio: ["servicio"],
    palabrasConsejero: ["consejero"],
    palabrasVigilia: ["vigilia"],
  },
};
