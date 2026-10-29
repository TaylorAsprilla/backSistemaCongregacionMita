-- Completa campos históricos vacíos con la información vigente disponible.
-- No modifica valores existentes ni informes que ya tengan snapshot de responsables.
-- Los datos inferidos desde asignaciones actuales son una aproximación, no una
-- reconstrucción garantizada de las asignaciones existentes al cerrar el informe.

DROP TEMPORARY TABLE IF EXISTS tmp_responsables_actuales_informe;
DROP TEMPORARY TABLE IF EXISTS tmp_unidad_actual_informe;

CREATE TEMPORARY TABLE tmp_responsables_actuales_informe (
  tipo_congregacion VARCHAR(20) NOT NULL,
  congregacion_id INT NOT NULL,
  nombre_unidad VARCHAR(255) NOT NULL,
  nombre_pais VARCHAR(255) NULL,
  nombre_congregacion VARCHAR(255) NULL,
  nombre_campo VARCHAR(255) NULL,
  usuario_id INT NOT NULL,
  tipo_responsabilidad VARCHAR(20) NOT NULL
);

INSERT INTO tmp_responsables_actuales_informe
  (tipo_congregacion, congregacion_id, nombre_unidad, nombre_pais,
   nombre_congregacion, nombre_campo, usuario_id, tipo_responsabilidad)
SELECT 'PAIS', p.id, p.pais, p.pais, NULL, NULL, p.idObreroEncargado, 'OBRERO_PAIS'
  FROM pais p
 WHERE p.idObreroEncargado IS NOT NULL
   AND p.idObreroEncargado > 0
   AND p.estado = 1
UNION ALL
SELECT 'CONGREGACION', c.id, c.congregacion, p.pais, c.congregacion, NULL,
       c.idObreroEncargado, 'PRINCIPAL'
  FROM congregacion c
  LEFT JOIN pais p ON p.id = c.pais_id
 WHERE c.idObreroEncargado IS NOT NULL
   AND c.idObreroEncargado > 0
   AND c.estado = 1
UNION ALL
SELECT 'CONGREGACION', c.id, c.congregacion, p.pais, c.congregacion, NULL,
       c.idObreroEncargadoDos, 'AUXILIAR'
  FROM congregacion c
  LEFT JOIN pais p ON p.id = c.pais_id
 WHERE c.idObreroEncargadoDos IS NOT NULL
   AND c.idObreroEncargadoDos > 0
   AND (c.idObreroEncargado IS NULL
        OR c.idObreroEncargadoDos <> c.idObreroEncargado)
   AND c.estado = 1
UNION ALL
SELECT 'CAMPO', f.id, f.campo, p.pais, c.congregacion, f.campo,
       f.idObreroEncargado, 'PRINCIPAL'
  FROM campo f
  JOIN congregacion c ON c.id = f.congregacion_id
  LEFT JOIN pais p ON p.id = c.pais_id
 WHERE f.idObreroEncargado IS NOT NULL
   AND f.idObreroEncargado > 0
   AND f.estado = 1
UNION ALL
SELECT 'CAMPO', f.id, f.campo, p.pais, c.congregacion, f.campo,
       f.idObreroEncargadoDos, 'AUXILIAR'
  FROM campo f
  JOIN congregacion c ON c.id = f.congregacion_id
  LEFT JOIN pais p ON p.id = c.pais_id
 WHERE f.idObreroEncargadoDos IS NOT NULL
   AND f.idObreroEncargadoDos > 0
   AND (f.idObreroEncargado IS NULL
        OR f.idObreroEncargadoDos <> f.idObreroEncargado)
   AND f.estado = 1;

-- Un informe legado sin Congregación solo se vincula cuando su creador tiene
-- exactamente una unidad formal actualmente asignada. Si es ambiguo, se omite.
CREATE TEMPORARY TABLE tmp_unidad_actual_informe AS
SELECT usuario_id,
       MAX(tipo_congregacion) AS tipo_congregacion,
       MAX(congregacion_id) AS congregacion_id,
       MAX(nombre_unidad) AS nombre_unidad,
       MAX(nombre_pais) AS nombre_pais,
       MAX(nombre_congregacion) AS nombre_congregacion,
       MAX(nombre_campo) AS nombre_campo
  FROM tmp_responsables_actuales_informe
 GROUP BY usuario_id
HAVING COUNT(DISTINCT CONCAT(tipo_congregacion, ':', congregacion_id)) = 1;

START TRANSACTION;

UPDATE informe i
JOIN tmp_unidad_actual_informe u ON u.usuario_id = i.usuario_id
   SET i.tipo_congregacion = u.tipo_congregacion,
       i.congregacion_id = u.congregacion_id,
       i.nombre_unidad = COALESCE(NULLIF(i.nombre_unidad, ''), u.nombre_unidad),
       i.nombre_pais = COALESCE(NULLIF(i.nombre_pais, ''), u.nombre_pais),
       i.nombre_congregacion = COALESCE(NULLIF(i.nombre_congregacion, ''), u.nombre_congregacion),
       i.nombre_campo = COALESCE(NULLIF(i.nombre_campo, ''), u.nombre_campo)
 WHERE i.estado = 'Cerrado'
   AND i.tipo_congregacion IS NULL
   AND i.congregacion_id IS NULL;

UPDATE informe i
JOIN pais p ON i.tipo_congregacion = 'PAIS'
           AND p.id = i.congregacion_id
   SET i.nombre_unidad = COALESCE(NULLIF(i.nombre_unidad, ''), p.pais),
       i.nombre_pais = COALESCE(NULLIF(i.nombre_pais, ''), p.pais)
 WHERE i.estado = 'Cerrado';

UPDATE informe i
JOIN congregacion c ON i.tipo_congregacion = 'CONGREGACION'
                    AND c.id = i.congregacion_id
LEFT JOIN pais p ON p.id = c.pais_id
   SET i.nombre_unidad = COALESCE(NULLIF(i.nombre_unidad, ''), c.congregacion),
       i.nombre_pais = COALESCE(NULLIF(i.nombre_pais, ''), p.pais),
       i.nombre_congregacion = COALESCE(NULLIF(i.nombre_congregacion, ''), c.congregacion)
 WHERE i.estado = 'Cerrado';

UPDATE informe i
JOIN campo f ON i.tipo_congregacion = 'CAMPO'
             AND f.id = i.congregacion_id
JOIN congregacion c ON c.id = f.congregacion_id
LEFT JOIN pais p ON p.id = c.pais_id
   SET i.nombre_unidad = COALESCE(NULLIF(i.nombre_unidad, ''), f.campo),
       i.nombre_pais = COALESCE(NULLIF(i.nombre_pais, ''), p.pais),
       i.nombre_congregacion = COALESCE(NULLIF(i.nombre_congregacion, ''), c.congregacion),
       i.nombre_campo = COALESCE(NULLIF(i.nombre_campo, ''), f.campo)
 WHERE i.estado = 'Cerrado';

-- Captura responsables actuales solo en informes cerrados sin ninguna fila de
-- snapshot. Los snapshots existentes nunca se reemplazan ni se completan a medias.
INSERT INTO informeResponsable
  (informe_id, usuario_id, nombre_responsable, tipo_responsabilidad, createdAt, updatedAt)
SELECT DISTINCT
       i.id,
       r.usuario_id,
       TRIM(CONCAT_WS(' ',
         NULLIF(TRIM(u.primerNombre), ''),
         NULLIF(TRIM(u.segundoNombre), ''),
         NULLIF(TRIM(u.primerApellido), ''),
         NULLIF(TRIM(u.segundoApellido), '')
       )),
       r.tipo_responsabilidad,
       NOW(),
       NOW()
  FROM informe i
  JOIN tmp_responsables_actuales_informe r
    ON r.tipo_congregacion COLLATE utf8mb4_unicode_ci =
       i.tipo_congregacion COLLATE utf8mb4_unicode_ci
   AND r.congregacion_id = i.congregacion_id
  JOIN usuario u ON u.id = r.usuario_id
 WHERE i.estado = 'Cerrado'
   AND NOT EXISTS (
     SELECT 1
       FROM informeResponsable ir
      WHERE ir.informe_id = i.id
   )
   AND TRIM(CONCAT_WS(' ',
         NULLIF(TRIM(u.primerNombre), ''),
         NULLIF(TRIM(u.segundoNombre), ''),
         NULLIF(TRIM(u.primerApellido), ''),
         NULLIF(TRIM(u.segundoApellido), '')
       )) <> '';

COMMIT;

DROP TEMPORARY TABLE IF EXISTS tmp_unidad_actual_informe;
DROP TEMPORARY TABLE IF EXISTS tmp_responsables_actuales_informe;
