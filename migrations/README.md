# Migraciones de Base de Datos

Este directorio contiene los scripts SQL para migraciones de la base de datos.

## Cómo ejecutar las migraciones

### Opción 1: MySQL CLI (Recomendado)

```bash
# Para desarrollo (usando las credenciales del .env)
mysql -u root -ptaylor89 sistemaCMI_dev < migrations/001-add-categoria-profesion.sql

# Para QA
mysql -u u434635530_userQA -pz~Xbi4ebzK2 u434635530_informesQA < migrations/001-add-categoria-profesion.sql

# Para producción
mysql -u adminCMI -pD7E494M*kZdp -h databaserdscmi.cwpcio4h7dru.us-east-2.rds.amazonaws.com sistemaCMI < migrations/001-add-categoria-profesion.sql
```

### Opción 2: phpMyAdmin (XAMPP)

1. Abre phpMyAdmin en `http://localhost/phpmyadmin`
2. Selecciona la base de datos `sistemaCMI_dev`
3. Ve a la pestaña "SQL"
4. Copia y pega el contenido del archivo `001-add-categoria-profesion.sql`
5. Haz clic en "Ejecutar"

### Opción 3: MySQL Workbench

1. Abre MySQL Workbench
2. Conecta a tu base de datos
3. Abre el archivo `001-add-categoria-profesion.sql`
4. Ejecuta el script

### Opción 4: Desde Node.js / Terminal

```bash
# Asegúrate de estar en la raíz del proyecto
cd c:/xampp/htdocs/congregacion/puertoRico/backSistemaCongregacionMita

# Ejecuta el script SQL
mysql -u root -ptaylor89 sistemaCMI_dev < migrations/001-add-categoria-profesion.sql
```

## Migraciones Disponibles

### 001-add-categoria-profesion.sql

**Fecha:** 2026-03-07  
**Descripción:**

- Crea la tabla `categoriaProfesion`
- Elimina la columna `ocupacion` de la tabla `usuario`
- Agrega la columna `categoriaProfesion_id` a la tabla `usuario`
- Inserta 25 categorías profesionales predefinidas
- Crea índices y foreign keys necesarios

**Categorías insertadas:**

1. Sin Categoría Profesión (por defecto)
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

## Verificación

Después de ejecutar la migración, puedes verificar que se aplicó correctamente:

```sql
-- Verificar que la tabla existe
SHOW TABLES LIKE 'categoriaProfesion';

-- Verificar las categorías insertadas
SELECT id, nombre FROM categoriaProfesion ORDER BY id;

-- Verificar la estructura de la tabla usuario
DESCRIBE usuario;

-- Verificar que la columna existe
SHOW COLUMNS FROM usuario LIKE 'categoriaProfesion_id';

-- Verificar que la foreign key existe
SELECT
  TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'usuario'
  AND COLUMN_NAME = 'categoriaProfesion_id';
```

## Rollback (Revertir cambios)

Si necesitas revertir esta migración:

```sql
-- Eliminar la foreign key
ALTER TABLE usuario DROP FOREIGN KEY fk_usuario_categoriaProfesion;

-- Eliminar la columna
ALTER TABLE usuario DROP COLUMN categoriaProfesion_id;

-- Agregar de nuevo la columna ocupacion
ALTER TABLE usuario ADD COLUMN ocupacion VARCHAR(255) NULL AFTER anoConocimiento;

-- Eliminar la tabla
DROP TABLE IF EXISTS categoriaProfesion;
```

## Notas Importantes

- **BACKUP:** Siempre haz un backup de la base de datos antes de ejecutar migraciones en producción
- La categoría con `id = 1` ("Sin Categoría Profesión") se estableció como valor por defecto
- Los usuarios existentes se asignarán automáticamente a la categoría por defecto (id = 1)
- La columna `ocupacion` será eliminada permanentemente
- La foreign key está configurada con `ON DELETE RESTRICT` para evitar eliminar categorías que estén en uso
