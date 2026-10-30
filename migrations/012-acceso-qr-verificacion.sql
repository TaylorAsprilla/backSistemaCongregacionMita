-- Aplicar antes de desplegar el backend y frontend QR juntos.
-- No modifica sesiones, codigos ni registros historicos.
ALTER TABLE qrAccesos
  MODIFY COLUMN idQrCode INT NULL,
  MODIFY COLUMN nombre VARCHAR(255) NULL,
  ADD COLUMN esGuarda TINYINT(1) NULL,
  ADD COLUMN enTurnoGuarda TINYINT(1) NULL,
  ADD COLUMN puesto VARCHAR(50) NULL,
  ADD COLUMN resultado VARCHAR(30) NULL,
  ADD COLUMN resultadoIdentidad VARCHAR(30) NULL,
  ADD COLUMN motivoRechazo VARCHAR(80) NULL,
  ADD INDEX idx_qr_accesos_ip_fecha (ip, createdAt),
  ADD INDEX idx_qr_accesos_guarda_puesto (esGuarda, puesto);

CREATE TABLE desafioAccesoQr (
  id CHAR(36) NOT NULL PRIMARY KEY,
  idQrCode INT NOT NULL,
  idUsuario INT NOT NULL,
  resumenCodigo VARCHAR(64) NOT NULL,
  intentosFallidos INT NOT NULL DEFAULT 0,
  fechaExpiracion DATETIME NOT NULL,
  fechaConsumo DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_desafio_qr_usuario_fecha (idUsuario, createdAt),
  INDEX idx_desafio_qr_expiracion (fechaExpiracion)
) ENGINE=InnoDB;
