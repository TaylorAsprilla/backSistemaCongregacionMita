-- Tour guiado de la fotografía de perfil: guarda en la base de datos si el usuario ya lo vio,
-- para que no se repita al entrar desde otro navegador o equipo.
--
-- Aplicar ANTES de desplegar el backend que usa la columna (si faltara, el tour sigue
-- funcionando con el respaldo del navegador, pero se repetiría entre navegadores).
-- Verificar: SHOW COLUMNS FROM usuario LIKE 'fotoTourVisto';
ALTER TABLE usuario
  ADD COLUMN fotoTourVisto TINYINT(1) NOT NULL DEFAULT 0;

-- Rollback:
-- ALTER TABLE usuario DROP COLUMN fotoTourVisto;
