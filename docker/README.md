# Guía de Docker para Desarrollo Local

## Configuración Inicial

### 1. Prerrequisitos

- Docker Desktop instalado y ejecutándose
- Git Bash (para Windows) o terminal compatible con bash

### 2. Configuración de Variables de Entorno

1. Copia el archivo `.env.docker` a `.env.local`:

   ```bash
   cp .env.docker .env.local
   ```

2. Edita `.env.local` y reemplaza los valores `REPLACE_WITH_...` por credenciales exclusivas para desarrollo local. No uses credenciales de producción ni reutilices contraseñas:
   ```bash
   DB_USERNAME_DEV=tu-usuario-local
   DB_PASSWORD_DEV=tu-contraseña-local
   JWT_SECRET_RESET=un-secreto-aleatorio-local
   # Configuración de email (opcional para desarrollo)
   USER_EMAIL_DEVELOPMENT=tu-email@gmail.com
   PASS_EMAIL_DEVELOPMENT=tu-contraseña-de-aplicación
   ```

### 3. Iniciar Entorno Docker

#### Opción A: Solo Base de Datos (Recomendado para desarrollo)

```bash
npm run docker:db-only
```

#### Opción B: Entorno Completo (Base de datos + API)

```bash
npm run docker:up
```

## 🚀 Comandos Disponibles

| Comando                  | Descripción                      |
| ------------------------ | -------------------------------- |
| `npm run docker:build`   | Construir las imágenes Docker    |
| `npm run docker:up`      | Iniciar todos los contenedores   |
| `npm run docker:down`    | Detener todos los contenedores   |
| `npm run docker:db-only` | Solo base de datos y phpMyAdmin  |
| `npm run docker:logs`    | Ver logs en tiempo real          |
| `npm run docker:clean`   | Limpiar contenedores y volúmenes |
| `npm run docker:reset`   | Reset completo del entorno       |
| `npm run docker:help`    | Mostrar ayuda                    |

## 🔗 URLs de Acceso

- **phpMyAdmin**: http://localhost:8081
- **API**: http://localhost:3000 (si usas docker:up)
- **MySQL**: localhost:3307

## 📊 Credenciales de Base de Datos

### Root

- **Usuario**: ``
- **Contraseña**: ``

### Usuario de aplicación

- **Usuario**: ``
- **Contraseña**: ``
- **Base de datos**: ``

## 🛠️ Desarrollo Local

### Opción 1: Solo DB en Docker + API Local

1. Iniciar solo la base de datos:

   ```bash
   npm run docker:db-only
   ```

2. Actualizar configuración local para usar Docker DB:

   ```bash
   # En tu archivo .env local
   DB_HOST_DEV=localhost
   DB_PORT_DEV=3307
   DB_USERNAME_DEV=
   DB_PASSWORD_DEV=
   DB_DATABASE_DEV=
   ```

3. Ejecutar API localmente:
   ```bash
   npm run build:dev  # En terminal 1
   npm run start:dev  # En terminal 2
   ```

### Opción 2: Todo en Docker

```bash
npm run docker:up
```

## Configuraciones Personalizadas

### Archivo de configuración MySQL

Edita `docker/mysql/conf/custom.cnf` para personalizar MySQL.

### Scripts de inicialización

Agrega scripts SQL en `docker/mysql/init/` para ejecutar al crear la DB.

## Solución de Problemas

### Puerto 3307 en uso

Si tienes XAMPP ejecutándose, detén MySQL de XAMPP o cambia el puerto en `docker-compose.yml`:

```yaml
ports:
  - "3308:3306" # Cambiar de 3307 a 3308
```

### Limpiar datos corruptos

```bash
npm run docker:clean
npm run docker:up
```

### Reset completo

```bash
npm run docker:reset
npm run docker:build
npm run docker:up
```

## Notas Importantes

1. **Persistencia**: Los datos se guardan en volúmenes Docker y persisten entre reinicios
2. **Red**: Todos los contenedores están en la red `congregacion_network`
3. **Logs**: Ubicados en `/var/log/mysql/` dentro del contenedor
4. **Timezone**: Configurado en UTC por defecto

## Flujo de Trabajo Recomendado

1. **Desarrollo diario**:

   ```bash
   npm run docker:db-only
   npm run build:dev
   npm run start:dev
   ```

2. **Testing completo**:

   ```bash
   npm run docker:up
   # Hacer pruebas
   npm run docker:down
   ```

3. **Antes de commit**:
   ```bash
   npm run docker:clean
   npm run docker:up
   # Verificar que todo funciona
   npm run docker:down
   ```
