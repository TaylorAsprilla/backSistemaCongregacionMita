-- 005: Índice para el Dashboard Ejecutivo de Supervisión Congregacional.
-- Acelera la búsqueda de informes por trimestre (`periodo`) y obrero (`usuario_id`).
-- Es idempotente: si el índice ya existe no hace nada (MySQL no soporta CREATE INDEX IF NOT EXISTS).

SET @existe_indice := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'informe'
     AND INDEX_NAME = 'idx_informe_periodo_usuario'
);

SET @sql := IF(
  @existe_indice = 0,
  'ALTER TABLE informe ADD INDEX idx_informe_periodo_usuario (periodo, usuario_id)',
  'SELECT ''idx_informe_periodo_usuario ya existe'' AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
