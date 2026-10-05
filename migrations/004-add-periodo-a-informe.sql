ALTER TABLE informe
ADD COLUMN periodo DATE NULL;

UPDATE informe
SET periodo = CASE
  WHEN MONTH(createdAt) IN (1, 4, 7, 10)
    AND createdAt < DATE_ADD(
      DATE_ADD(DATE_FORMAT(createdAt, '%Y-%m-01'), INTERVAL 8 DAY),
      INTERVAL 5 MINUTE
    )
  THEN CASE MONTH(createdAt)
    WHEN 1 THEN DATE_FORMAT(DATE_SUB(createdAt, INTERVAL 3 MONTH), '%Y-10-01')
    WHEN 4 THEN DATE_FORMAT(createdAt, '%Y-01-01')
    WHEN 7 THEN DATE_FORMAT(createdAt, '%Y-04-01')
    WHEN 10 THEN DATE_FORMAT(createdAt, '%Y-07-01')
  END
  ELSE DATE_FORMAT(
    createdAt,
    CONCAT('%Y-', LPAD(((QUARTER(createdAt) - 1) * 3) + 1, 2, '0'), '-01')
  )
END;
