# Documentación del Sistema

Bienvenido a la documentación completa del Sistema de la Congregación Mita Inc.

## 📚 Índice de Documentación

### 1. [API Documentation](API.md)

Documentación completa de todos los endpoints de la API REST.

**Contenido:**

- Autenticación (Login y Renovar Token)
- Endpoints de Usuarios (GET, POST, PUT)
- Endpoints de Categorías de Profesión (CRUD completo)
- Códigos de error y respuestas
- Ejemplos de requests con CURL
- Listado de 25 categorías profesionales

**Cuándo usar:**

- Cuando necesites integrar el frontend con el backend
- Para probar endpoints manualmente
- Para entender los contratos de la API

---

### 2. [Database Schema](DATABASE.md)

Documentación del esquema de base de datos y migraciones.

**Contenido:**

- Estructura de tabla `categoriaProfesion`
- Modificaciones a tabla `usuario`
- Foreign keys y relaciones
- Scripts de migración
- Queries de ejemplo y optimización
- Procedimientos de backup y rollback

**Cuándo usar:**

- Antes de ejecutar migraciones
- Para entender las relaciones entre tablas
- Para escribir queries SQL personalizadas
- Para debugging de problemas de base de datos

---

### 3. [Architecture](ARQUITECTURA.md)

Arquitectura completa del sistema backend.

**Contenido:**

- Estructura del proyecto
- Capas de la aplicación (Routes, Controllers, Models)
- Flujo de peticiones HTTP
- Patrones de diseño utilizados
- Stack tecnológico
- Consideraciones de seguridad
- Optimizaciones implementadas
- Estrategias de escalabilidad

**Cuándo usar:**

- Para nuevos desarrolladores en el proyecto
- Para planificar nuevas features
- Para entender el flujo de datos
- Para decisiones de arquitectura

---

### 4. [Changelog](CHANGELOG.md)

Historial de cambios y versiones del proyecto.

**Contenido:**

- Cambios recientes (v1.1.0)
- Nuevas características agregadas
- Optimizaciones de rendimiento
- Mejoras de seguridad
- Listado de categorías profesionales

**Cuándo usar:**

- Para conocer qué cambió en cada versión
- Para release notes
- Para tracking de nuevas features

---

### 5. [Quick Start Guide](QUICKSTART.md)

Guía de inicio rápido para desarrolladores.

**Contenido:**

- Configuración en 5 pasos (15 minutos)
- Verificación de instalación
- Solución de problemas comunes
- Comandos esenciales
- Checklist de instalación

**Cuándo usar:**

- Primera vez configurando el proyecto
- Onboarding de nuevos desarrolladores
- Troubleshooting de problemas comunes

---

### 6. [CURL Examples](EJEMPLOS-CURL.md)

Ejemplos prácticos de CURL para testing de API.

**Contenido:**

- Ejemplos de CURL para todos los endpoints
- Casos de prueba completos
- Manejo de errores
- Scripts de automatización
- Comandos para Windows PowerShell

**Cuándo usar:**

- Para probar endpoints manualmente
- Para automatizar testing
- Para debugging de problemas de API
- Como referencia rápida de sintaxis

---

### 7. [Best Practices](BEST-PRACTICES.md)

Mejores prácticas y estándares de desarrollo.

**Contenido:**

- Estándares de código (nomenclatura, estructura)
- Git y control de versiones (branches, commits)
- Base de datos (migraciones, índices, foreign keys)
- API y endpoints (RESTful, responses, validaciones)
- Seguridad (JWT, passwords, sanitización)
- Testing (unit tests, integration tests)
- Documentación y comentarios

**Cuándo usar:**

- Al escribir código nuevo
- Durante code reviews
- Para onboarding de nuevos desarrolladores
- Como referencia de estándares del proyecto

---

## 🚀 Inicio Rápido

### Para Desarrolladores Nuevos

**⚡ Ruta Rápida (15 minutos):**

1. Lee la [Quick Start Guide](QUICKSTART.md)
2. Sigue los 5 pasos de configuración
3. Verifica que todo funcione

**📚 Ruta Completa (para entender a fondo):**

1. **Configuración inicial:**
   - Lee el [README principal](../README.md)
   - Sigue la [Quick Start Guide](QUICKSTART.md)
   - Revisa [ARQUITECTURA.md](ARQUITECTURA.md) para entender el proyecto

2. **Ejecutar migraciones:**
   - Lee [DATABASE.md](DATABASE.md) sección "Migraciones"
   - Ejecuta `npm run migrate`

3. **Probar la API:**
   - Inicia el servidor: `npm run build:dev` y `npm run start:dev`
   - Usa los ejemplos en [EJEMPLOS-CURL.md](EJEMPLOS-CURL.md)
   - Revisa [API.md](API.md) para documentación completa

---

## 📋 Guías por Tarea

### Agregar un Nuevo Endpoint

1. Crear el **modelo** en `src/models/`
2. Crear el **controller** en `src/controllers/`
3. Crear las **rutas** en `src/routes/`
4. Registrar las rutas en `src/server.model.ts`
5. Actualizar [API.md](API.md) con la documentación
6. Si requiere cambios de BD, crear migración (ver [DATABASE.md](DATABASE.md))

### Ejecutar Migraciones

```bash
npm run migrate
```

Ver [DATABASE.md](DATABASE.md) para más opciones y troubleshooting.

### Agregar una Nueva Relación de BD

1. Modificar el modelo en `src/models/`
2. Actualizar `src/database/associations.ts`
3. Crear script de migración SQL
4. Documentar en [DATABASE.md](DATABASE.md)
5. Actualizar [ARQUITECTURA.md](ARQUITECTURA.md) si es necesario

### Proteger un Endpoint con JWT

```typescript
import { validarJWT } from "../middlewares/validar-jwt";

router.get("/", validarJWT, tuController);
```

Ver [ARQUITECTURA.md](ARQUITECTURA.md) sección "Seguridad".

---

## 🔍 Búsqueda Rápida

### Por Tema

| Tema                  | Documento                              | Sección         |
| --------------------- | -------------------------------------- | --------------- |
| Configuración inicial | [QUICKSTART.md](QUICKSTART.md)         | Paso a paso     |
| Ejemplos de CURL      | [EJEMPLOS-CURL.md](EJEMPLOS-CURL.md)   | Todas           |
| Endpoints HTTP        | [API.md](API.md)                       | Todas           |
| Autenticación         | [API.md](API.md)                       | Autenticación   |
| Estructura de datos   | [DATABASE.md](DATABASE.md)             | Esquema         |
| Migraciones           | [DATABASE.md](DATABASE.md)             | Migraciones     |
| Relaciones de modelos | [DATABASE.md](DATABASE.md)             | Relaciones      |
| Arquitectura MVC      | [ARQUITECTURA.md](ARQUITECTURA.md)     | Capas           |
| Flujo de requests     | [ARQUITECTURA.md](ARQUITECTURA.md)     | Flujo           |
| Seguridad             | [ARQUITECTURA.md](ARQUITECTURA.md)     | Seguridad       |
| Optimizaciones        | [ARQUITECTURA.md](ARQUITECTURA.md)     | Optimizaciones  |
| Solución de problemas | [QUICKSTART.md](QUICKSTART.md)         | Troubleshooting |
| Cambios recientes     | [CHANGELOG.md](CHANGELOG.md)           | Unreleased      |
| Estándares de código  | [BEST-PRACTICES.md](BEST-PRACTICES.md) | Estándares      |
| Git y commits         | [BEST-PRACTICES.md](BEST-PRACTICES.md) | Git             |
| API best practices    | [BEST-PRACTICES.md](BEST-PRACTICES.md) | API y Endpoints |

---

## 🛠️ Herramientas Recomendadas

### Para Desarrollo

- **VS Code** - Editor recomendado
- **Postman** o **Insomnia** - Pruebas de API
- **MySQL Workbench** - Gestión de base de datos
- **Git** - Control de versiones

### Extensiones VS Code

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- MySQL Syntax
- REST Client

---

## 📞 Contacto y Soporte

- **Email:** cmar.live_favor_no_responder@congregacionmita.org
- **Website:** https://cmar.live

Para reportar issues o solicitar features, contacta al equipo de desarrollo.

---

## 📝 Convenciones de Documentación

- ⭐ **NUEVO** - Características agregadas recientemente
- ✅ **COMPLETO** - Funcionalidad completamente implementada
- 🚧 **EN PROGRESO** - En desarrollo
- ⚠️ **IMPORTANTE** - Información crítica
- 💡 **TIP** - Consejos útiles

---

**Última actualización:** Marzo 2026  
**Versión del sistema:** 1.1.0  
**Mantenido por:** Congregación Mita Inc.
