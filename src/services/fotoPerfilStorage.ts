import {
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FotoPerfilError } from "../helpers/fotoPerfil";

export interface FotoPerfilStorage {
  guardar(clave: string, cuerpo: Buffer, contentType: string): Promise<void>;
  eliminar(clave: string): Promise<void>;
  urlFirmada(clave: string, segundos: number): Promise<string>;
}

/**
 * Bucket S3 privado. Las credenciales salen de la cadena por defecto del SDK
 * (rol de instancia de Elastic Beanstalk en producción); nunca se envían al frontend.
 *
 * Variables de entorno:
 *  - FOTOS_PERFIL_BUCKET   (obligatoria)
 *  - FOTOS_PERFIL_REGION   (opcional; usa AWS_REGION o us-east-1)
 */
class S3FotoPerfilStorage implements FotoPerfilStorage {
  private cliente?: S3Client;

  private obtenerCliente(): { cliente: S3Client; bucket: string } {
    const bucket = process.env.FOTOS_PERFIL_BUCKET;
    if (!bucket) {
      throw new FotoPerfilError(
        "ALMACENAMIENTO_NO_CONFIGURADO",
        "El almacenamiento de fotografías no está configurado.",
        503,
      );
    }
    if (!this.cliente) {
      this.cliente = new S3Client({
        region: process.env.FOTOS_PERFIL_REGION || process.env.AWS_REGION || "us-east-1",
      });
    }
    return { cliente: this.cliente, bucket };
  }

  async guardar(clave: string, cuerpo: Buffer, contentType: string): Promise<void> {
    const { cliente, bucket } = this.obtenerCliente();
    await cliente.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: clave,
        Body: cuerpo,
        ContentType: contentType,
        CacheControl: "private, max-age=31536000, immutable",
        ServerSideEncryption: "AES256",
      }),
    );
  }

  async eliminar(clave: string): Promise<void> {
    const { cliente, bucket } = this.obtenerCliente();
    await cliente.send(new DeleteObjectCommand({ Bucket: bucket, Key: clave }));
  }

  async urlFirmada(clave: string, segundos: number): Promise<string> {
    const { cliente, bucket } = this.obtenerCliente();
    return getSignedUrl(cliente, new GetObjectCommand({ Bucket: bucket, Key: clave }), {
      expiresIn: segundos,
    });
  }
}

let storage: FotoPerfilStorage = new S3FotoPerfilStorage();

export const getFotoPerfilStorage = (): FotoPerfilStorage => storage;

/** Permite sustituir el almacenamiento en pruebas. */
export const setFotoPerfilStorage = (nuevo: FotoPerfilStorage): void => {
  storage = nuevo;
};

/** Vigencia de las URLs firmadas (FOTOS_PERFIL_URL_TTL, entre 60 s y 1 h; 15 min por defecto). */
export const ttlUrlFoto = (): number =>
  Math.min(Math.max(Number(process.env.FOTOS_PERFIL_URL_TTL) || 900, 60), 3600);
