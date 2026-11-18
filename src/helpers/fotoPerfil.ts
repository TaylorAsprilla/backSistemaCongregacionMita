import { randomUUID } from "crypto";
import sharp from "sharp";

export const FOTO_PERFIL_MAX_BYTES = 5 * 1024 * 1024;
export const FOTO_PERFIL_MIN_DIMENSION = 200;
export const FOTO_PERFIL_SALIDA_PX = 512;
export const FOTO_PERFIL_PREFIJO = "usuarios/fotos-perfil/";

// Evita "bombas de descompresión": imágenes pequeñas en bytes pero enormes en píxeles.
const MAX_PIXELES_ENTRADA = 50_000_000;
const FORMATOS_PERMITIDOS = ["jpeg", "png", "webp"];

export type CodigoFotoPerfil =
  | "IMAGEN_VACIA"
  | "IMAGEN_MUY_GRANDE"
  | "FORMATO_NO_PERMITIDO"
  | "IMAGEN_CORRUPTA"
  | "IMAGEN_MUY_PEQUENA"
  | "ALMACENAMIENTO_NO_CONFIGURADO"
  | "ALMACENAMIENTO_ERROR"
  | "SESION_NO_PERMITIDA"
  | "USUARIO_NO_ENCONTRADO";

export class FotoPerfilError extends Error {
  constructor(
    public readonly code: CodigoFotoPerfil,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "FotoPerfilError";
  }
}

/**
 * Valida el contenido real de la imagen (no confía en extensión ni MIME),
 * aplica la orientación EXIF, recorta al centro a 1:1 si hiciera falta,
 * limita a 512 px y la convierte a WebP sin metadatos.
 */
export async function procesarFotoPerfil(entrada: unknown): Promise<Buffer> {
  if (!Buffer.isBuffer(entrada) || entrada.length === 0) {
    throw new FotoPerfilError("IMAGEN_VACIA", "No se recibió ninguna imagen.");
  }
  if (entrada.length > FOTO_PERFIL_MAX_BYTES) {
    throw new FotoPerfilError(
      "IMAGEN_MUY_GRANDE",
      "La imagen supera el tamaño máximo permitido de 5 MB.",
      413,
    );
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(entrada, { limitInputPixels: MAX_PIXELES_ENTRADA }).metadata();
  } catch {
    throw new FotoPerfilError("IMAGEN_CORRUPTA", "El archivo no es una imagen válida.");
  }

  if (!metadata.format || !FORMATOS_PERMITIDOS.includes(metadata.format)) {
    throw new FotoPerfilError(
      "FORMATO_NO_PERMITIDO",
      "Formato de imagen no permitido. Use JPG, PNG o WEBP.",
      415,
    );
  }

  // Con orientación EXIF 5-8 el ancho y el alto reales quedan intercambiados.
  const girada = (metadata.orientation ?? 1) >= 5;
  const ancho = (girada ? metadata.height : metadata.width) ?? 0;
  const alto = (girada ? metadata.width : metadata.height) ?? 0;
  if (ancho < FOTO_PERFIL_MIN_DIMENSION || alto < FOTO_PERFIL_MIN_DIMENSION) {
    throw new FotoPerfilError(
      "IMAGEN_MUY_PEQUENA",
      `La imagen debe tener al menos ${FOTO_PERFIL_MIN_DIMENSION} x ${FOTO_PERFIL_MIN_DIMENSION} píxeles.`,
    );
  }

  try {
    return await sharp(entrada, { limitInputPixels: MAX_PIXELES_ENTRADA })
      .rotate()
      .resize(FOTO_PERFIL_SALIDA_PX, FOTO_PERFIL_SALIDA_PX, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: false,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new FotoPerfilError("IMAGEN_CORRUPTA", "El archivo no es una imagen válida.");
  }
}

export function prefijoFotoUsuario(usuarioId: number): string {
  return `${FOTO_PERFIL_PREFIJO}${usuarioId}/`;
}

/** Clave no predecible: el UUID evita colisiones y adivinar rutas. */
export function generarClaveFotoPerfil(usuarioId: number): string {
  return `${prefijoFotoUsuario(usuarioId)}${randomUUID()}.webp`;
}

/**
 * Solo se considera una clave gestionada por esta funcionalidad si pertenece
 * al usuario. Valores heredados de la columna `foto` quedan ignorados y nunca
 * se eliminan del almacenamiento.
 */
export function esClaveFotoDeUsuario(clave: unknown, usuarioId: number): clave is string {
  return (
    typeof clave === "string" &&
    clave.startsWith(prefijoFotoUsuario(usuarioId)) &&
    !clave.includes("..")
  );
}
