# Guía de Inicio Rápido - Desarrolladores

Esta guía te ayudará a configurar y ejecutar el proyecto en 15 minutos.

## ⏱️ Configuración en 5 Pasos (15 minutos)

### Paso 1: Prerrequisitos (3 minutos)

Verifica que tengas instalado:

```bash
# Node.js >= 14.x
node --version

# npm >= 6.x
npm --version

# MySQL >= 5.7
mysql --version

# Git
git --version
```

Si falta algo:

- **Node.js**: Descarga de [nodejs.org](https://nodejs.org/)
- **MySQL**: Descarga XAMPP de [apachefriends.org](https://www.apachefriends.org/)
- **Git**: Descarga de [git-scm.com](https://git-scm.com/)

---

### Paso 2: Clonar e Instalar (3 minutos)

```bash
# Clonar repositorio
git clone <repository-url>
cd backSistemaCongregacionMita

# Instalar dependencias
npm install
```

**Esperar instalación** (puede tardar 2-3 minutos)

---

### Paso 3: Configurar Base de Datos (3 minutos)

#### 3.1. Crear Base de Datos

```sql
-- Abrir MySQL (XAMPP o MySQL Workbench)
CREATE DATABASE sistemaCMI_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 3.2. Configurar Variables de Entorno

Crea el archivo `.env` en la raíz del proyecto:

```env
NODE_ENV=development
PORT=3000

# Base de datos
DB_HOST_DEV=localhost
DB_USERNAME_DEV=root
DB_PASSWORD_DEV=taylor89
DB_DATABASE_DEV=sistemaCMI_dev
DB_PORT_DEV=3306

# JWT
JWT_SECRET=tu_secreto_super_seguro_aqui_12345

# API Key
API_KEY=tu_api_key_aqui

# Email (opcional para desarrollo)
USER_EMAIL_DEVELOPMENT=email@example.com
PASS_EMAIL_DEVELOPMENT=password
```

**⚠️ IMPORTANTE:** Cambia `tu_secreto_super_seguro_aqui_12345` por un valor único.

---

### Paso 4: Ejecutar Migraciones (2 minutos)

```bash
# Ejecutar migraciones
npm run migrate
```

**Deberías ver:**

```
✓ Creando tabla categoriaProfesion...
✓ Insertando 25 categorías...
✓ Corrigiendo fechas inválidas...
✓ Agregando columna categoriaProfesion_id...
✓ Creando foreign key...
✓ Creando índice...
✓ Migración completada exitosamente
```

---

### Paso 5: Iniciar Servidor (2 minutos)

#### Opción A: Desarrollo con Hot Reload (Recomendado)

Abre **2 terminales**:

**Terminal 1: Compilar TypeScript**

```bash
npm run build:dev
```

**Terminal 2: Ejecutar Servidor**

```bash
npm run start:dev
```

#### Opción B: Modo Normal

```bash
# Compilar una vez
npm run build

# Iniciar servidor
npm start
```

**Deberías ver:**

```
┌──────────────────────────────────────────┐
│ Servidor corriendo en el puerto: 3000   │
│ Ambiente: development                    │
│ Base de datos: sistemaCMI_dev           │
└──────────────────────────────────────────┘
```

---

## ✅ Verificar Instalación

### 1. Probar Endpoint de Health Check

```bash
curl http://localhost:3000/api/
```

**Respuesta esperada:**

```json
{
  "ok": true,
  "msg": "API funcionando correctamente"
}
```

### 2. Probar Login (si tienes usuario)

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin@example.com",
    "password": "password123"
  }'
```

### 3. Probar Categorías (si tienes token)

```bash
curl -X GET http://localhost:3000/api/categorias-profesion \
  -H "x-token: YOUR_JWT_TOKEN"
```

---

## 🎯 Próximos Pasos

### Para Desarrollo Frontend

1. **Obtener un token JWT**
   - Usa el endpoint `/api/login`
   - Guarda el token en localStorage/sessionStorage

2. **Usar el token en todas las requests**

   ```javascript
   fetch("http://localhost:3000/api/usuarios/56", {
     headers: {
       "x-token": "YOUR_JWT_TOKEN",
     },
   });
   ```

3. **Ver ejemplos completos**
   - Consulta [EJEMPLOS-CURL.md](EJEMPLOS-CURL.md)
   - Revisa [API.md](API.md)

### Para Desarrollo Backend

1. **Entender la arquitectura**
   - Lee [ARQUITECTURA.md](ARQUITECTURA.md)
   - Revisa la estructura de carpetas

2. **Crear un nuevo endpoint**
   - Crea el modelo en `src/models/`
   - Crea el controller en `src/controllers/`
   - Crea las rutas en `src/routes/`
   - Registra en `src/server.model.ts`

3. **Trabajar con la base de datos**
   - Lee [DATABASE.md](DATABASE.md)
   - Aprende sobre Sequelize ORM

---

## 🐛 Solución de Problemas

### Problema 1: Error al conectar a la base de datos

```
Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'root'@'localhost'
```

**Solución:**

- Verifica las credenciales en `.env`
- Asegúrate de que MySQL esté corriendo (XAMPP)
- Verifica el puerto (normalmente 3306)

```bash
# Windows (XAMPP)
# Inicia Apache y MySQL desde el panel de XAMPP
```

### Problema 2: Puerto 3000 en uso

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

O cambia el puerto en `.env`:

```env
PORT=3001
```

### Problema 3: Migraciones no se ejecutan

**Solución:**

```bash
# Verificar conexión a MySQL
mysql -u root -p

# Verificar que la base de datos existe
SHOW DATABASES;

# Si no existe, crearla
CREATE DATABASE sistemaCMI_dev;

# Intentar migración manual
mysql -u root -p sistemaCMI_dev < migrations/001-add-categoria-profesion.sql
```

### Problema 4: TypeScript no compila

```
Error: Cannot find module 'express'
```

**Solución:**

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Limpiar caché
npm cache clean --force
npm install
```

### Problema 5: Token JWT inválido

```json
{
  "ok": false,
  "msg": "Token no válido"
}
```

**Solución:**

- Verifica que `JWT_SECRET` en `.env` sea el mismo que se usó para generar el token
- Verifica que el token no haya expirado (24 horas)
- Obtén un nuevo token con `/api/login`

---

## 📚 Recursos Útiles

### Documentación del Proyecto

- [README Principal](../README.md)
- [API Documentation](API.md)
- [Database Schema](DATABASE.md)
- [Architecture](ARQUITECTURA.md)
- [Ejemplos CURL](EJEMPLOS-CURL.md)

### Tecnologías

- [Express.js](https://expressjs.com/)
- [Sequelize ORM](https://sequelize.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [JWT](https://jwt.io/)

### Herramientas

- [Postman](https://www.postman.com/) - Testing API
- [MySQL Workbench](https://www.mysql.com/products/workbench/) - DB Management
- [VS Code](https://code.visualstudio.com/) - Editor

---

## 🔑 Comandos Esenciales

```bash
# Desarrollo
npm run build:dev    # Compilar con watch mode
npm run start:dev    # Iniciar servidor desarrollo

# Producción
npm run build        # Compilar TypeScript
npm start            # Iniciar servidor

# Base de datos
npm run migrate      # Ejecutar migraciones

# Docker
npm run docker:up    # Iniciar contenedores
npm run docker:down  # Detener contenedores
npm run docker:logs  # Ver logs

# Git
git status           # Ver cambios
git add .            # Agregar todos los cambios
git commit -m "msg"  # Hacer commit
git push             # Subir cambios
```

---

## 👥 Obtener Ayuda

### 1. Consultar Documentación

Revisa la carpeta `docs/` para toda la documentación.

### 2. Revisar Código Existente

Busca ejemplos similares en:

- `src/controllers/` - Lógica de negocio
- `src/routes/` - Definición de endpoints
- `src/models/` - Estructura de datos

### 3. Contactar al Equipo

- Email: cmar.live_favor_no_responder@congregacionmita.org
- Crear un issue en el repositorio

---

## ✅ Checklist de Instalación

- [ ] Node.js instalado
- [ ] MySQL instalado y corriendo
- [ ] Proyecto clonado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Base de datos creada
- [ ] Archivo `.env` configurado
- [ ] Migraciones ejecutadas
- [ ] Servidor iniciado
- [ ] Endpoint de health check funciona
- [ ] Login funciona (si tienes usuario)

---

## 🎓 Conceptos Clave

### JWT (JSON Web Token)

Token de autenticación que se envía en el header `x-token`.

### Sequelize ORM

Mapea objetos JavaScript a tablas de MySQL.

### Middleware

Funciones que se ejecutan antes del controller (ej: `validarJWT`).

### TypeScript

JavaScript con tipos estáticos que se compila a JavaScript.

### Express

Framework web para Node.js.

---

## 🚀 Tips para Productividad

### 1. Usa Nodemon (ya incluido)

Los cambios se reflejan automáticamente en modo desarrollo.

### 2. Usa Thunder Client o REST Client

Extensión de VS Code para probar APIs sin salir del editor.

### 3. Usa Git Branches

```bash
git checkout -b feature/mi-nueva-feature
```

### 4. Usa ESLint y Prettier

Para mantener código consistente (configuración ya incluida).

### 5. Revisa los Logs

El servidor muestra logs detallados de cada request.

---

**¡Listo para empezar a desarrollar! 🎉**

Si tienes problemas, consulta [ARQUITECTURA.md](ARQUITECTURA.md) o [API.md](API.md).
