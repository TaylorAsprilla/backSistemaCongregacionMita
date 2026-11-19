-- Centro de notificaciones de CMAR LIVE.
-- Crea la tabla `notificacion` (no modifica ninguna tabla existente ni sus registros).
-- Aplicar ANTES de desplegar el backend que expone /api/notificaciones.
--
-- * clave_evento + usuario_id es único: evita notificaciones repetidas por un mismo evento
--   (la inserción usa INSERT IGNORE).
-- * No se guarda el contenido de los informes: solo entidad_tipo / entidad_id y la ruta de destino.
-- * Sin clave foránea a `usuario` a propósito: los usuarios se desactivan, no se eliminan, y así la
--   migración no depende del tipo exacto de usuario.id. La depuración periódica limpia el historial.
CREATE TABLE IF NOT EXISTS notificacion (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  categoria ENUM('INFORMATIVA', 'PENDIENTE', 'ADMINISTRATIVA', 'SOLICITUD') NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje VARCHAR(500) NOT NULL,
  entidad_tipo VARCHAR(30) NULL,
  entidad_id INT NULL,
  url_destino VARCHAR(255) NULL,
  clave_evento VARCHAR(191) NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  fecha_lectura DATETIME NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notificacion_usuario_evento (usuario_id, clave_evento),
  KEY idx_notificacion_usuario_leida_fecha (usuario_id, leida, fecha_creacion),
  KEY idx_notificacion_usuario_fecha (usuario_id, fecha_creacion),
  KEY idx_notificacion_usuario_categoria_fecha (usuario_id, categoria, fecha_creacion),
  KEY idx_notificacion_expiracion (fecha_expiracion)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Verificación:  SHOW CREATE TABLE notificacion;
-- Rollback:      DROP TABLE notificacion;
