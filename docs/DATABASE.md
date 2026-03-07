# Documentación de Base de Datos

## Tabla de Contenidos

- [Esquema de Base de Datos](#esquema-de-base-de-datos)
- [Tabla categoriaProfesion](#tabla-categoriaprofesion)
- [Tabla usuario](#tabla-usuario)
- [Relaciones](#relaciones)
- [Migraciones](#migraciones)

---

## Esquema de Base de Datos

### Tabla: `categoriaProfesion`

Nueva tabla para normalizar las profesiones de los usuarios.

```sql
CREATE TABLE `categoriaProfesion` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` TEXT NULL,
  `estado` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Campos

| Campo       | Tipo         | Nulo | Descripción                                       |
| ----------- | ------------ | ---- | ------------------------------------------------- |
| id          | INT          | NO   | ID único de la categoría (AUTO_INCREMENT)         |
| nombre      | VARCHAR(255) | NO   | Nombre de la categoría (UNIQUE)                   |
| descripcion | TEXT         | YES  | Descripción detallada de la categoría             |
| estado      | TINYINT(1)   | NO   | Estado activo/inactivo (1 = activo, 0 = inactivo) |
| createdAt   | DATETIME     | NO   | Fecha de creación                                 |
| updatedAt   | DATETIME     | NO   | Fecha de última actualización                     |

#### Índices

- PRIMARY KEY: `id`
- UNIQUE KEY: `nombre`

---

### Tabla: `usuario` (Modificaciones)

#### Nuevos Campos

```sql
ALTER TABLE `usuario`
  ADD COLUMN `categoriaProfesion_id` INT NOT NULL DEFAULT 1 AFTER `anoConocimiento`;
```

| Campo                 | Tipo         | Nulo | Default | Descripción                            |
| --------------------- | ------------ | ---- | ------- | -------------------------------------- |
| categoriaProfesion_id | INT          | NO   | 1       | FK a categoriaProfesion                |
| ocupacion             | VARCHAR(255) | YES  | NULL    | Texto libre para información adicional |

**Nota:** El campo `ocupacion` se mantiene para permitir detalles específicos adicionales.

#### Foreign Keys

```sql
ALTER TABLE `usuario`
  ADD CONSTRAINT `fk_usuario_categoriaProfesion`
    FOREIGN KEY (`categoriaProfesion_id`)
    REFERENCES `categoriaProfesion` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
```

- **ON DELETE RESTRICT**: No permite eliminar una categoría si hay usuarios asociados
- **ON UPDATE CASCADE**: Actualiza automáticamente si se modifica el ID de la categoría

#### Índices Agregados

```sql
CREATE INDEX `idx_usuario_categoriaProfesion`
  ON `usuario` (`categoriaProfesion_id`);
```

---

## Relaciones

### Usuario → CategoriaProfesion (Many to One)

```
usuario.categoriaProfesion_id → categoriaProfesion.id
```

**Modelo Sequelize:**

```typescript
Usuario.hasOne(CategoriaProfesion, {
  as: "categoriaProfesion",
  sourceKey: "categoriaProfesion_id",
  foreignKey: "id",
});
```

**Ejemplo de Query:**

```javascript
const usuario = await Usuario.findByPk(56, {
  include: [
    {
      model: CategoriaProfesion,
      as: "categoriaProfesion",
      attributes: ["id", "nombre", "descripcion"],
    },
  ],
});
```

---

## Migraciones

### Archivo de Migración

📁 `migrations/001-add-categoria-profesion.sql`

### Ejecutar Migración

#### Opción 1: Node.js

```bash
npm run migrate
```

#### Opción 2: MySQL CLI

```bash
mysql -u root -ptaylor89 sistemaCMI_dev < migrations/001-add-categoria-profesion.sql
```

#### Opción 3: Windows Batch

```bash
migrations\migrate.bat
```

#### Opción 4: Bash (Linux/Mac)

```bash
bash migrations/migrate.sh
```

### Pasos de la Migración

1. **Crea tabla `categoriaProfesion`**
2. **Inserta 25 categorías predefinidas**
3. **Corrige fechas inválidas** en tabla usuario (`0000-00-00`)
4. **Agrega columna** `categoriaProfesion_id` a tabla usuario
5. **Crea foreign key** entre usuario y categoriaProfesion
6. **Crea índice** para mejorar el rendimiento

### Verificar Migración

```sql
-- Verificar que la tabla existe
SHOW TABLES LIKE 'categoriaProfesion';

-- Verificar las categorías insertadas
SELECT id, nombre FROM categoriaProfesion ORDER BY id;

-- Verificar la columna en usuario
DESCRIBE usuario;

-- Verificar la foreign key
SELECT
  TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'usuario'
  AND COLUMN_NAME = 'categoriaProfesion_id';
```

### Rollback (Revertir)

```sql
-- Eliminar la foreign key
ALTER TABLE usuario DROP FOREIGN KEY fk_usuario_categoriaProfesion;

-- Eliminar el índice
DROP INDEX idx_usuario_categoriaProfesion ON usuario;

-- Eliminar la columna
ALTER TABLE usuario DROP COLUMN categoriaProfesion_id;

-- Eliminar la tabla
DROP TABLE IF EXISTS categoriaProfesion;
```

---

## Datos de Prueba

### Categorías por Defecto

La migración inserta automáticamente 25 categorías:

1. Sin Categoría Profesión (ID: 1) - **Por defecto**
2. Estudiantes y menores
3. Hogar y labores del hogar
4. Pensionados / retirados / incapacitados
5. Sin información / no aplica
6. Servicios varios / ocupación genérica
7. Salud y sector social
8. Construcción, mantenimiento y oficios técnicos
9. Administración, oficina y recursos humanos
10. Comercio, ventas y atención al cliente
11. Educación e investigación
12. Tecnología e ingeniería
13. Transporte y logística
14. Contabilidad, finanzas y banca
15. Independiente / emprendimiento general
16. Belleza, confección y cuidado personal
17. Seguridad, vigilancia y fuerza pública
18. Servicio doméstico y apoyo personal
19. Gastronomía y alimentos
20. Agropecuario y medio ambiente
21. Desempleados
22. Arte, cultura y comunicación
23. Legal y justicia
24. Religioso y ministerial
25. Otros específicos por revisar

---

## Consideraciones de Rendimiento

### Índices

- `categoriaProfesion.nombre` (UNIQUE) - Optimiza búsquedas por nombre
- `usuario.categoriaProfesion_id` (INDEX) - Optimiza JOINs

### Queries Recomendadas

```sql
-- Obtener usuarios por categoría
SELECT u.*, c.nombre as categoria
FROM usuario u
INNER JOIN categoriaProfesion c ON u.categoriaProfesion_id = c.id
WHERE c.id = 12;

-- Contar usuarios por categoría
SELECT
  c.nombre as categoria,
  COUNT(u.id) as total_usuarios
FROM categoriaProfesion c
LEFT JOIN usuario u ON c.id = u.categoriaProfesion_id
WHERE c.estado = 1
GROUP BY c.id, c.nombre
ORDER BY total_usuarios DESC;

-- Buscar usuarios sin ocupación específica
SELECT *
FROM usuario
WHERE categoriaProfesion_id = 1 OR categoriaProfesion_id = 5;
```

---

## Backup y Mantenimiento

### Backup Antes de Migrar

```bash
# MySQL Dump
mysqldump -u root -p sistemaCMI_dev > backup_antes_migracion_$(date +%Y%m%d).sql

# Comprimir
gzip backup_antes_migracion_$(date +%Y%m%d).sql
```

### Mantenimiento Regular

```sql
-- Verificar integridad de foreign keys
SELECT u.id, u.primerNombre, u.categoriaProfesion_id
FROM usuario u
LEFT JOIN categoriaProfesion c ON u.categoriaProfesion_id = c.id
WHERE c.id IS NULL;

-- Limpiar categorías no utilizadas
SELECT c.id, c.nombre, COUNT(u.id) as usuarios
FROM categoriaProfesion c
LEFT JOIN usuario u ON c.id = u.categoriaProfesion_id
GROUP BY c.id
HAVING usuarios = 0;
```
