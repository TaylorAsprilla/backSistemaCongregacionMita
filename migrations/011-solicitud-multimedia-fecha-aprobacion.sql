-- Aplicar antes de desplegar el backend. No inferir datos historicos desde updatedAt.
ALTER TABLE solicitudMultimedia
  ADD COLUMN fechaAprobacion DATETIME NULL DEFAULT NULL,
  ADD COLUMN duracionAprobadaDias DECIMAL(14, 6) NULL DEFAULT NULL;
