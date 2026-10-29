CREATE TABLE IF NOT EXISTS informeAuditoria (
  id BIGINT NOT NULL AUTO_INCREMENT,
  informe_id INT NOT NULL,
  seccion VARCHAR(40) NOT NULL,
  registro_id INT NULL,
  accion VARCHAR(30) NOT NULL,
  usuario_id INT NULL,
  cambios JSON NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_informe_auditoria_informe_fecha (informe_id, fecha),
  KEY idx_informe_auditoria_usuario (usuario_id),
  CONSTRAINT fk_informe_auditoria_informe
    FOREIGN KEY (informe_id) REFERENCES informe(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
