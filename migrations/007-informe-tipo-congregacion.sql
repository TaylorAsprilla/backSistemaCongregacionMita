ALTER TABLE informe
  DROP INDEX uq_informe_periodo_unidad,
  CHANGE COLUMN tipo_unidad tipo_congregacion VARCHAR(20) NULL,
  CHANGE COLUMN unidad_id congregacion_id INT NULL,
  ADD UNIQUE KEY uq_informe_periodo_congregacion
    (periodo, tipo_congregacion, congregacion_id);
