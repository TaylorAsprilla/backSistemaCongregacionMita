-- Fotografía de perfil: la columna usuario.foto guarda la clave del objeto en S3
-- (p. ej. usuarios/fotos-perfil/56/<uuid>.webp, ~66 caracteres). Si en la base
-- es más corta que VARCHAR(255), MySQL trunca la clave y la foto no se ve al recargar.
--
-- 1) Verificar el tipo actual:
--    SHOW COLUMNS FROM usuario LIKE 'foto';
-- 2) Aplicar antes de desplegar (los valores existentes se conservan; permite NULL):
ALTER TABLE usuario
  MODIFY COLUMN foto VARCHAR(255) NULL;
