# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [Unreleased] - 2026-03-07

### ✨ Agregado

- **Sistema de Categorías de Profesión**
  - Nueva tabla `categoriaProfesion` con 25 categorías predefinidas
  - CRUD completo para gestión de categorías profesionales
  - Endpoint `/api/categorias-profesion` con operaciones GET, POST, PUT, DELETE
  - Relación obligatoria entre Usuario y CategoriaProfesion
  - Campo `categoriaProfesion_id` agregado a tabla usuario (obligatorio)
  - Campo `ocupacion` mantenido para información adicional (opcional)

- **Migraciones de Base de Datos**
  - Script SQL para crear tabla `categoriaProfesion`
  - Script para insertar 25 categorías predefinidas
  - Script para agregar columna `categoriaProfesion_id` a tabla usuario
  - Script de corrección de fechas inválidas (`0000-00-00`)
  - Scripts de migración para Node.js, Bash y Windows Batch

### 🔒 Seguridad

- Protección JWT agregada al endpoint `GET /api/usuarios/:id`
- Validación obligatoria de `categoriaProfesion_id` en creación de usuarios

### ⚡ Optimizaciones

- Optimización del endpoint `GET /api/usuarios/:id`
  - Eliminado `all: true` que cargaba todas las relaciones
  - Carga específica de solo 12 relaciones esenciales
  - Exclusión de campos sensibles (password, resetToken)
  - Reducción significativa del tiempo de respuesta
  - Menor uso de memoria y carga en base de datos

### 🔧 Mejoras

- Permisos del usuario agregados al endpoint `GET /api/usuarios/:id`
- Categoría de profesión agregada al response de `/api/login` y `/api/login/renew`
- Mejores mensajes de error y validación
- Documentación completa con ejemplos de CURL

### 📝 Documentación

- Documentación de migraciones en `migrations/README.md`
- Ejemplos de requests POST y PUT para usuarios
- Ejemplos de CURL para categorías de profesión
- Guía de instalación y ejecución de migraciones

## Categorías de Profesión Disponibles

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
