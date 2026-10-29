ALTER TABLE informe
  ADD COLUMN tipo_unidad VARCHAR(20) NULL,
  ADD COLUMN unidad_id INT NULL,
  ADD COLUMN nombre_unidad VARCHAR(255) NULL,
  ADD COLUMN nombre_pais VARCHAR(255) NULL,
  ADD COLUMN nombre_congregacion VARCHAR(255) NULL,
  ADD COLUMN nombre_campo VARCHAR(255) NULL,
  ADD COLUMN fecha_cierre DATETIME NULL,
  ADD COLUMN usuario_cierre_id INT NULL,
  ADD UNIQUE KEY uq_informe_periodo_unidad (periodo, tipo_unidad, unidad_id);

CREATE TABLE informeResponsable (
  id INT NOT NULL AUTO_INCREMENT,
  informe_id INT NOT NULL,
  usuario_id INT NULL,
  nombre_responsable VARCHAR(255) NOT NULL,
  tipo_responsabilidad VARCHAR(20) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_informe_responsable_informe (informe_id),
  CONSTRAINT fk_informe_responsable_informe
    FOREIGN KEY (informe_id) REFERENCES informe (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_informe_responsable_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
    ON UPDATE CASCADE ON DELETE SET NULL
);
