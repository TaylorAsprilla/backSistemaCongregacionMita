# Fotografía de perfil

Cada usuario autenticado puede subir, cambiar y eliminar **su propia** fotografía.
El archivo se guarda en un bucket S3 **privado**; MySQL solo guarda la clave del objeto
en `Usuario.foto`.

## Endpoints (`/api/foto-perfil`, todos requieren `x-token`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/` | Fotografía y URL firmada del usuario autenticado. |
| `POST` | `/` | Sube la fotografía. Cuerpo binario con `Content-Type: image/jpeg`, `image/png` o `image/webp` (máx. 5 MB). |
| `DELETE` | `/` | Elimina la fotografía y vuelve al avatar con iniciales. |
| `POST` | `/urls` | Body `{ "ids": [1, 2, …] }` (máx. 100). Devuelve las URLs firmadas de los usuarios que tienen foto, para avatares en listados. |

El usuario siempre sale del JWT; no existe ningún parámetro para operar sobre otro usuario.
Las sesiones QR reciben `403 SESION_NO_PERMITIDA`.

Códigos de error: `IMAGEN_VACIA`, `IMAGEN_MUY_GRANDE` (413), `FORMATO_NO_PERMITIDO` (415),
`IMAGEN_CORRUPTA`, `IMAGEN_MUY_PEQUENA`, `ALMACENAMIENTO_NO_CONFIGURADO` (503),
`ALMACENAMIENTO_ERROR` (502), `SESION_NO_PERMITIDA` (403), `USUARIO_NO_ENCONTRADO` (404).

## Procesamiento (sharp)

El contenido real se valida con `sharp` (no se confía en extensión ni MIME): solo JPEG, PNG
o WEBP, mínimo 200 x 200 px, límite de 50 Mpx contra bombas de descompresión. Se aplica la
orientación EXIF, se recorta al centro a 1:1, se reduce a 512 x 512 y se guarda como WebP
sin metadatos.

## Consistencia

* Subida: 1) procesa, 2) guarda el objeto nuevo, 3) actualiza `Usuario.foto`, 4) solo entonces
  elimina el objeto anterior. Si falla S3 no se toca la BD; si falla MySQL se elimina el objeto
  nuevo y se conserva la foto anterior.
* Eliminación: primero se pone `foto = NULL` y luego se borra el objeto (un fallo al borrar
  queda en el log como `[FOTO_PERFIL] Objeto huérfano` para limpieza manual).
* Solo se gestionan claves `usuarios/fotos-perfil/{usuarioId}/{uuid}.webp`. Cualquier otro
  valor heredado en `Usuario.foto` se ignora y nunca se borra de S3.

## Configuración en AWS (a cargo de infraestructura)

1. Crear un bucket **privado** (p. ej. `cmar-fotos-perfil`) con *Block all public access* activo
   y cifrado SSE-S3. No requiere CORS (las imágenes se cargan con `<img>`).
2. Añadir al rol de instancia de Elastic Beanstalk (`aws-elasticbeanstalk-ec2-role` o el que use
   el entorno) esta política, limitada al prefijo:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::cmar-fotos-perfil/usuarios/fotos-perfil/*"
    }
  ]
}
```

3. Definir en el entorno: `FOTOS_PERFIL_BUCKET` (obligatoria), `FOTOS_PERFIL_REGION`
   y `FOTOS_PERFIL_URL_TTL` (opcionales). En local, el SDK usa las credenciales por defecto
   de AWS (`~/.aws/credentials` o variables `AWS_*`). Las credenciales nunca llegan al frontend.

## Base de datos

No hay migración: se reutiliza la columna existente `Usuario.foto` (VARCHAR(255), NULL).
Antes de desplegar verificar que la columna exista y revisar valores heredados:

```sql
SHOW COLUMNS FROM usuario LIKE 'foto';
SELECT COUNT(*) FROM usuario WHERE foto IS NOT NULL;
```

Los valores previos se ignoran. Si la columna es más corta que VARCHAR(255), aplique : MySQL trunca la clave en silencio y la foto no se ve al recargar.

## Pruebas

```bash
node --test tests/foto-perfil.test.cjs   # helper de imagen y controlador (S3/MySQL simulados)
```
