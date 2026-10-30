-- Aplicar antes de desplegar el backend y frontend QR actualizados.
-- Los registros históricos quedan en NULL porque no contienen esta respuesta.
ALTER TABLE qrAccesos
  ADD COLUMN esCuidadora TINYINT(1) NULL;
