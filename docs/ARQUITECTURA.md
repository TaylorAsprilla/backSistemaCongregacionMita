# Arquitectura del Proyecto

## Estructura del Proyecto

```
backSistemaCongregacionMita/
├── src/
│   ├── assets/              # Recursos estáticos (imágenes, templates)
│   ├── config/              # Configuración del proyecto
│   │   ├── config.ts        # Configuración por ambiente
│   │   └── mailer.ts        # Configuración de email
│   ├── controllers/         # Lógica de negocio
│   │   ├── usuario.controller.ts
│   │   ├── categoriaProfesion.controller.ts  ⭐ NUEVO
│   │   ├── login.controller.ts
│   │   └── ...
│   ├── crons/               # Tareas programadas
│   ├── database/            # Configuración de base de datos
│   │   ├── connection.ts    # Conexión a MySQL
│   │   └── associations.ts  # Relaciones entre modelos
│   ├── enum/                # Enumeraciones TypeScript
│   ├── helpers/             # Funciones auxiliares
│   ├── middlewares/         # Middlewares (autenticación, validación)
│   │   ├── validar-jwt.ts
│   │   └── validar-campos.ts
│   ├── models/              # Modelos Sequelize
│   │   ├── usuario.model.ts
│   │   ├── categoriaProfesion.model.ts  ⭐ NUEVO
│   │   └── ...
│   ├── routes/              # Definición de rutas
│   │   ├── usuario.routes.ts
│   │   ├── categoriaProfesion.routes.ts  ⭐ NUEVO
│   │   └── ...
│   ├── templates/           # Templates de email
│   ├── types/               # Tipos TypeScript personalizados
│   └── server.model.ts      # Configuración del servidor Express
├── migrations/              # Scripts de migración de BD ⭐ NUEVO
│   ├── 001-add-categoria-profesion.sql
│   ├── run-migration.js
│   ├── run-migration.ts
│   ├── migrate.sh
│   ├── migrate.bat
│   └── README.md
├── docs/                    # Documentación ⭐ NUEVO
│   ├── API.md
│   ├── DATABASE.md
│   ├── ARQUITECTURA.md
│   └── CHANGELOG.md
├── build/                   # Código compilado (JS)
├── docker/                  # Configuración Docker
├── .env                     # Variables de entorno
├── app.ts                   # Punto de entrada
├── package.json
└── tsconfig.json
```

---

## Capas de la Aplicación

### 1. Capa de Presentación (Routes)

**Ubicación:** `src/routes/`

Responsabilidad: Definir endpoints HTTP y aplicar middlewares de validación.

```typescript
// Ejemplo: categoriaProfesion.routes.ts
router.get("/", validarJWT, getCategoriasProfesion);
router.post(
  "/",
  [validarJWT, check("nombre").not().isEmpty()],
  crearCategoriaProfesion,
);
```

**Middlewares aplicados:**

- `validarJWT` - Autenticación
- `check()` - Validación de campos
- `validarCampos` - Procesamiento de errores de validación

---

### 2. Capa de Lógica de Negocio (Controllers)

**Ubicación:** `src/controllers/`

Responsabilidad: Implementar la lógica de negocio y coordinar modelos.

```typescript
// Ejemplo: categoriaProfesion.controller.ts
export const getCategoriasProfesion = async (req: Request, res: Response) => {
  try {
    const categorias = await CategoriaProfesion.findAll({
      where: { estado: true },
      order: db.col("nombre"),
    });

    res.json({ ok: true, categorias });
  } catch (error) {
    res.status(500).json({ ok: false, msg: "Error del servidor" });
  }
};
```

**Responsabilidades de los Controllers:**

- Validación de lógica de negocio
- Interacción con modelos
- Manejo de errores
- Formateo de respuestas
- Logging

---

### 3. Capa de Datos (Models)

**Ubicación:** `src/models/`

Responsabilidad: Definir estructura de datos y mapeo ORM.

```typescript
// Ejemplo: categoriaProfesion.model.ts
const CategoriaProfesion = db.define(
  "CategoriaProfesion",
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1,
    },
  },
  {
    freezeTableName: true,
    tableName: "categoriaProfesion",
  },
);
```

---

### 4. Capa de Relaciones (Associations)

**Ubicación:** `src/database/associations.ts`

Responsabilidad: Definir relaciones entre modelos.

```typescript
// Relación Usuario → CategoriaProfesion
Usuario.hasOne(CategoriaProfesion, {
  as: "categoriaProfesion",
  sourceKey: "categoriaProfesion_id",
  foreignKey: "id",
});
```

---

## Flujo de una Petición HTTP

```
Cliente → Express → Middleware → Controller → Model → Database
                     ↓              ↓           ↓         ↓
                  validarJWT    Lógica    Sequelize   MySQL
                  validarCampos  |            |         |
                     ↓           |            |         |
                  Si falla ←─────┘            |         |
                     ↓                        |         |
                  Return 401/400              |         |
                                             |         |
                  Si pasa ──────────────────→|         |
                                           Query ─────→|
                                                       |
                  Response ←───── Controller ←─ Result ←┘
                     ↓
                  Cliente
```

### Ejemplo de Flujo Completo

1. **Cliente hace request:**

   ```http
   GET /api/categorias-profesion
   x-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Express recibe la petición** → Enruta a `categoriaProfesion.routes.ts`

3. **Middleware validarJWT**
   - Verifica el token
   - Si es inválido → return 401
   - Si es válido → agrega `req.id` y `req.login`

4. **Controller getCategoriasProfesion**
   - Accede al modelo CategoriaProfesion
   - Ejecuta query con Sequelize

5. **Sequelize ORM**
   - Traduce a SQL: `SELECT * FROM categoriaProfesion WHERE estado = 1 ORDER BY nombre`
   - Ejecuta en MySQL

6. **MySQL retorna datos** → Sequelize → Controller

7. **Controller formatea respuesta**

   ```json
   {
     "ok": true,
     "categorias": [...]
   }
   ```

8. **Express envía response al cliente**

---

## Patrones de Diseño Utilizados

### 1. MVC (Model-View-Controller)

- **Model**: Sequelize models en `src/models/`
- **View**: Cliente frontend (fuera de este proyecto)
- **Controller**: Lógica en `src/controllers/`

### 2. Middleware Pattern

Funciones que se ejecutan antes del controller:

- Autenticación (JWT)
- Validación de campos
- Manejo de errores

### 3. Repository Pattern

Sequelize actúa como repositorio, abstrayendo el acceso a datos.

### 4. Singleton Pattern

- Conexión a base de datos (`database/connection.ts`)
- Instancia del servidor Express

---

## Tecnologías Principales

### Backend

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipado estático

### Base de Datos

- **MySQL** - Base de datos relacional
- **Sequelize** - ORM para Node.js

### Autenticación

- **JWT (jsonwebtoken)** - Tokens de acceso
- **bcryptjs** - Hash de contraseñas

### Validación

- **express-validator** - Validación de campos

### Email

- **Nodemailer** - Envío de correos

### Otros

- **node-cron** - Tareas programadas
- **cors** - Control de acceso CORS
- **dotenv** - Variables de entorno

---

## Seguridad

### Autenticación JWT

```typescript
// Generación de token
const token = jwt.sign({ id, login }, JWT_SECRET, { expiresIn: "24h" });

// Verificación
const { id, login } = jwt.verify(token, JWT_SECRET);
```

### Protección de Rutas

Todas las rutas (excepto `/login`) requieren `validarJWT`:

```typescript
router.get("/", validarJWT, getUsuarios);
router.post("/", validarJWT, crearUsuario);
```

### Hash de Contraseñas

```typescript
const salt = bcrypt.genSaltSync();
const hashedPassword = bcrypt.hashSync(password, salt);
```

### Exclusión de Datos Sensibles

```typescript
attributes: {
  exclude: ["password", "resetToken"];
}
```

---

## Optimizaciones

### 1. Consultas Optimizadas

- Uso de índices en campos frecuentes
- Select específico de columnas necesarias
- Eager loading eficiente con `include`

### 2. Carga Selectiva de Relaciones

```typescript
// ❌ Antes (lento)
include: [{ all: true }];

// ✅ Después (rápido)
include: [
  { model: CategoriaProfesion, attributes: ["id", "nombre"] },
  { model: Genero, attributes: ["id", "genero"] },
];
```

### 3. Índices de Base de Datos

```sql
CREATE INDEX idx_usuario_categoriaProfesion ON usuario (categoriaProfesion_id);
```

---

## Variables de Entorno

```env
NODE_ENV=development|qa|production

# Base de datos
DB_HOST_DEV=localhost
DB_USERNAME_DEV=root
DB_PASSWORD_DEV=password
DB_DATABASE_DEV=sistemaCMI_dev

# JWT
JWT_SECRET=your_secret_key

# Email
USER_EMAIL_DEVELOPMENT=email@example.com
PASS_EMAIL_DEVELOPMENT=password

# API Key
API_KEY=your_api_key
```

---

## Escalabilidad

### Preparado para:

1. **Múltiples ambientes** (dev, qa, prod)
2. **Autenticación distribuida** (JWT stateless)
3. **Separación de servicios** (microservicios potencial)
4. **Caché** (Redis - futuro)
5. **Load balancing** (múltiples instancias Node.js)

### Mejoras Futuras Sugeridas:

- Implementar Redis para caché
- Agregar rate limiting
- Implementar GraphQL para queries más eficientes
- Agregar tests automatizados (Jest)
- Implementar logging centralizado (Winston + ELK)
- Agregar monitoreo (Prometheus + Grafana)
