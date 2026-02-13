/**
 * DTOs para las respuestas del API REST de Congregaciones
 */

/**
 * DTO para una congregación en las respuestas del API
 */
export interface CongregacionDto {
  id: number;
  congregacion: string;
  pais_id: number;
  estado: boolean;
  email?: string | null;
  idObreroEncargado?: number | null;
  idObreroEncargadoDos?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Metadatos de paginación para respuestas paginadas
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Respuesta exitosa paginada para listado de congregaciones
 */
export interface CongregacionesListResponse {
  data: CongregacionDto[];
  meta: PaginationMeta;
}

/**
 * Estructura de error estandarizada
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Query params para el endpoint de listado de congregaciones
 */
export interface CongregacionesQueryParams {
  id_pais: number;
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: "nombre" | "createdAt";
  sortDir?: "asc" | "desc";
}
