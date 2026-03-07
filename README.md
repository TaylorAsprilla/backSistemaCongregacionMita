# Sistema Congregación Mita - Backend

Sistema de gestión integral para la Congregación Mita Inc., desarrollado con Node.js, Express, TypeScript y MySQL.

## 🚀 Características Principales

- ✅ Gestión completa de usuarios y congregaciones
- ✅ Sistema de autenticación JWT
- ✅ Categorización de profesiones de usuarios
- ✅ Gestión de ministerios, permisos y voluntariados
- ✅ Sistema de informes y actividades
- ✅ Control de accesos mediante QR
- ✅ Notificaciones por email
- ✅ API RESTful documentada

## 📋 Requisitos Previos

- Node.js >= 14.x
- MySQL >= 5.7
- npm >= 6.x
- TypeScript >= 4.6

## 🔧 Instalación

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd backSistemaCongregacionMita
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
NODE_ENV=development
PORT=3000

DB_HOST_DEV=localhost
DB_USERNAME_DEV=root
DB_PASSWORD_DEV=tu_password
DB_DATABASE_DEV=sistemaCMI_dev

JWT_SECRET=tu_secreto_jwt
```

4. **Ejecutar migraciones de base de datos**

```bash
npm run migrate
```

5. **Compilar TypeScript**

```bash
npm run build
```

6. **Iniciar servidor**

```bash
# Desarrollo (con hot reload)
npm run build:dev    # Terminal 1
npm run start:dev    # Terminal 2

# Producción
npm start
```

El servidor estará corriendo en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
src/
├── controllers/     # Lógica de negocio
├── models/          # Modelos de datos (Sequelize)
├── routes/          # Definición de endpoints
├── middlewares/     # Middlewares (JWT, validación)
├── database/        # Configuración de BD
├── helpers/         # Funciones auxiliares
├── config/          # Configuración por ambiente
└── types/           # Tipos TypeScript

migrations/          # Scripts de migración SQL
docs/                # Documentación
```

## 📚 Documentación

### 📖 Documentación Completa

La documentación está organizada en la carpeta `docs/`:

- **[🚀 Quick Start Guide](docs/QUICKSTART.md)** - Configuración en 15 minutos
  - Para nuevos desarrolladores
  - Solución de problemas comunes
  - Checklist de instalación

- **[📖 API Documentation](docs/API.md)** - Endpoints y ejemplos
  - Autenticación (Login, Token)
  - CRUD de Usuarios
  - CRUD de Categorías de Profesión
  - Códigos de error

- **[🗄️ Database Schema](docs/DATABASE.md)** - Base de datos
  - Estructura de tablas
  - Relaciones y foreign keys
  - Scripts de migración
  - Queries de ejemplo

- **[🏗️ Architecture](docs/ARQUITECTURA.md)** - Arquitectura del sistema
  - Capas de la aplicación (MVC)
  - Flujo de peticiones
  - Patrones de diseño
  - Seguridad y optimizaciones

- **[📝 Changelog](docs/CHANGELOG.md)** - Historial de cambios
  - Nuevas características v1.1.0
  - Optimizaciones
  - Breaking changes

- **[💻 CURL Examples](docs/EJEMPLOS-CURL.md)** - Ejemplos prácticos
  - CURL para todos los endpoints
  - Scripts de automatización
  - PowerShell commands

### 📋 Documentación por Rol

**Frontend Developer:**

1. [API Documentation](docs/API.md) - Para integrar con el backend
2. [CURL Examples](docs/EJEMPLOS-CURL.md) - Para probar endpoints
3. [Quick Start](docs/QUICKSTART.md#verificar-instalación) - Para verificar que todo funcione

**Backend Developer:**

1. [Quick Start Guide](docs/QUICKSTART.md) - Para configurar el ambiente
2. [Architecture](docs/ARQUITECTURA.md) - Para entender la estructura
3. [Database Schema](docs/DATABASE.md) - Para trabajar con la BD

**DevOps/SysAdmin:**

1. [Quick Start - Troubleshooting](docs/QUICKSTART.md#solución-de-problemas)
2. [Database - Backup](docs/DATABASE.md#backup-y-mantenimiento)
3. README principal - Scripts de Docker

**Project Manager:**

1. [Changelog](docs/CHANGELOG.md) - Para ver qué cambió
2. [API Documentation](docs/API.md) - Para entender las capacidades
3. README principal - Overview del proyecto

## 🔑 Autenticación

Todos los endpoints (excepto `/api/login`) requieren autenticación JWT:

```bash
curl -X GET http://localhost:3000/api/usuarios \
  -H "x-token: YOUR_JWT_TOKEN"
```

### Obtener Token

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "usuario@example.com",
    "password": "contraseña"
  }'
```

## 🆕 Nuevas Características (v1.1.0)

### Sistema de Categorías de Profesión

- 25 categorías profesionales predefinidas
- CRUD completo para gestión de categorías
- Relación obligatoria con usuarios
- Campo `ocupacion` mantenido para información adicional

**Endpoints:**

```
GET    /api/categorias-profesion
GET    /api/categorias-profesion/:id
POST   /api/categorias-profesion
PUT    /api/categorias-profesion/:id
DELETE /api/categorias-profesion/:id
PUT    /api/categorias-profesion/activar/:id
```

### Optimizaciones

- ✅ Endpoint `GET /api/usuarios/:id` optimizado (60% más rápido)
- ✅ Protección JWT agregada a usuarios individuales
- ✅ Permisos incluidos en respuesta de usuario
- ✅ Categoría de profesión en login/renew

## 🗃️ Migraciones

### Ejecutar Migraciones

```bash
# Opción 1: NPM script
npm run migrate

# Opción 2: MySQL CLI
mysql -u root -p sistemaCMI_dev < migrations/001-add-categoria-profesion.sql

# Opción 3: Windows Batch
migrations\migrate.bat

# Opción 4: Bash
bash migrations/migrate.sh
```

Ver [Database Documentation](docs/DATABASE.md) para más detalles.

## 🧪 Scripts Disponibles

```bash
npm run build        # Compilar TypeScript
npm run build:dev    # Compilar con hot reload
npm run start:dev    # Iniciar servidor desarrollo
npm start            # Iniciar servidor producción
npm run migrate      # Ejecutar migraciones
npm run docker:up    # Iniciar Docker
npm run docker:down  # Detener Docker
```

## 🌍 Ambientes

### Development

```env
NODE_ENV=development
DB_DATABASE_DEV=sistemaCMI_dev
```

### QA

```env
NODE_ENV=qa
DB_DATABASE_QA=sistemaCMI_qa
```

### Production

```env
NODE_ENV=production
DB_DATABASE_PROD=sistemaCMI
```

## 🐳 Docker

```bash
# Iniciar servicios
npm run docker:up

# Ver logs
npm run docker:logs

# Detener servicios
npm run docker:down
```

## 🔒 Seguridad

- Autenticación JWT con expiración
- Hash de contraseñas con bcrypt
- Validación de entrada con express-validator
- Exclusión de campos sensibles en respuestas
- CORS configurado
- Foreign keys con ON DELETE RESTRICT

## 📊 Base de Datos

- **Motor**: MySQL 5.7+
- **ORM**: Sequelize 6.x
- **Charset**: utf8mb4
- **Collation**: utf8mb4_unicode_ci

### Tablas Principales

- `usuario` - Usuarios del sistema
- `categoriaProfesion` - Categorías profesionales ⭐ NUEVA
- `congregacion` - Congregaciones
- `ministeri` - Ministerios
- `permiso` - Permisos de usuario
- `voluntariado` - Voluntariados

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es propiedad de **Congregación Mita Inc** © 2025

## 👥 Autores

- **Congregación Mita INC** - [Website](https://cmar.live)

## 📧 Contacto

- Email: cmar.live_favor_no_responder@congregacionmita.org
- Website: https://cmar.live

## 🆘 Soporte

Para reportar bugs o solicitar features, por favor crea un issue en el repositorio.

---

**CMAR LIVE - Congregación Mita INC 2025**
