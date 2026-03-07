# Mejores Prácticas de Desarrollo

Guía de estándares y mejores prácticas para el desarrollo del Sistema Congregación Mita.

## 📋 Tabla de Contenidos

- [Estándares de Código](#estándares-de-código)
- [Git y Control de Versiones](#git-y-control-de-versiones)
- [Base de Datos](#base-de-datos)
- [API y Endpoints](#api-y-endpoints)
- [Seguridad](#seguridad)
- [Testing](#testing)
- [Documentación](#documentación)

---

## 💻 Estándares de Código

### Nomenclatura

#### TypeScript/JavaScript

```typescript
// ✅ Bueno: PascalCase para clases y modelos
class Usuario extends Model {}
class CategoriaProfesion extends Model {}

// ✅ Bueno: camelCase para variables y funciones
const usuarioActivo = true;
const obtenerUsuarios = async () => {};

// ✅ Bueno: UPPER_SNAKE_CASE para constantes
const MAX_INTENTOS_LOGIN = 3;
const JWT_SECRET = process.env.JWT_SECRET;

// ❌ Malo: Inconsistente
const Usuario_activo = true;
const ObtenerUsuarios = async () => {};
```

#### Archivos

```
✅ Bueno:
- usuario.model.ts
- categoriaProfesion.controller.ts
- validar-jwt.ts

❌ Malo:
- Usuario.model.ts
- CategoriaProfesion-Controller.ts
- ValidarJWT.ts
```

### Estructura de Archivos

#### Controllers

```typescript
// ✅ Bueno: Estructura consistente
export const getUsuarios = async (req: Request, res: Response) => {
  try {
    // 1. Validaciones de entrada

    // 2. Lógica de negocio

    // 3. Respuesta
    res.json({ ok: true, usuarios });
  } catch (error) {
    // 4. Manejo de errores
    console.error("Error en getUsuarios:", error);
    res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};
```

#### Models

```typescript
// ✅ Bueno: Definición completa del modelo
const Usuario = db.define(
  "Usuario",
  {
    // Campos con validaciones
    primerNombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    // ...
  },
  {
    // Opciones del modelo
    freezeTableName: true,
    tableName: "usuario",
    timestamps: true,
  },
);

// Hooks si son necesarios
Usuario.beforeCreate(async (usuario) => {
  // Lógica antes de crear
});

export default Usuario;
```

### Comentarios

```typescript
// ✅ Bueno: Comentarios útiles
/**
 * Obtiene un usuario por ID con todas sus relaciones
 * @param req - Request con el ID del usuario en params
 * @param res - Response con los datos del usuario
 */
export const getUsuario = async (req: Request, res: Response) => {
  // Validación especial para IDs numéricos
  const id = parseInt(req.params.id);

  // Incluir solo relaciones necesarias para optimizar
  const usuario = await Usuario.findByPk(id, {
    include: [
      /* relaciones */
    ],
  });
};

// ❌ Malo: Comentarios obvios
// Esta función obtiene un usuario
export const getUsuario = async (req: Request, res: Response) => {
  // Obtener el id del request
  const id = req.params.id;
  // Buscar el usuario
  const usuario = await Usuario.findByPk(id);
};
```

---

## 🔀 Git y Control de Versiones

### Branches

```bash
# Estructura de branches
main              # Producción
├── develop       # Desarrollo
├── qa            # QA/Testing
├── feature/*     # Nuevas características
├── bugfix/*      # Corrección de bugs
└── hotfix/*      # Fixes urgentes en producción

# Ejemplos
feature/categorias-profesion
feature/filtros-usuarios
bugfix/login-token-expiration
hotfix/database-connection
```

### Commits

```bash
# ✅ Bueno: Mensajes descriptivos
git commit -m "feat: Agregar CRUD de categorías de profesión"
git commit -m "fix: Corregir validación de JWT en usuarios"
git commit -m "refactor: Optimizar query de usuarios (remove all:true)"
git commit -m "docs: Actualizar documentación de API"

# ❌ Malo: Mensajes vagos
git commit -m "cambios"
git commit -m "fix"
git commit -m "update"
```

### Convención de Commits

```
<tipo>(<alcance>): <descripción>

Tipos:
- feat: Nueva característica
- fix: Corrección de bug
- refactor: Refactorización de código
- docs: Cambios en documentación
- style: Formato, espacios, etc
- test: Agregar o modificar tests
- chore: Tareas de mantenimiento

Ejemplos:
feat(api): Agregar endpoint de categorías de profesión
fix(auth): Corregir expiración de token JWT
refactor(controllers): Optimizar queries de usuarios
docs(readme): Actualizar guía de instalación
```

---

## 🗄️ Base de Datos

### Migraciones

```sql
-- ✅ Bueno: Migración idempotente
-- Crear tabla solo si no existe
CREATE TABLE IF NOT EXISTS categoriaProfesion (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

-- Insertar solo si no existe
INSERT IGNORE INTO categoriaProfesion (id, nombre)
VALUES (1, 'Sin Categoría Profesión');

-- ❌ Malo: Sin verificación
CREATE TABLE categoriaProfesion ( ... );
INSERT INTO categoriaProfesion VALUES (1, 'Categoría');
```

### Nomenclatura de Tablas

```sql
-- ✅ Bueno: Singular, camelCase
usuario
categoriaProfesion
tipoActividad

-- ❌ Malo: Plural o inconsistente
usuarios
categoria_profesion
Tipo_Actividad
```

### Índices

```sql
-- ✅ Bueno: Índices en campos frecuentes
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_categoriaProfesion ON usuario(categoriaProfesion_id);

-- Nombre descriptivo: idx_<tabla>_<campo>
```

### Foreign Keys

```sql
-- ✅ Bueno: Con constraint name y opciones
ALTER TABLE usuario
  ADD CONSTRAINT fk_usuario_categoriaProfesion
    FOREIGN KEY (categoriaProfesion_id)
    REFERENCES categoriaProfesion(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Nombre: fk_<tabla_origen>_<tabla_destino>
```

---

## 🌐 API y Endpoints

### Rutas RESTful

```typescript
// ✅ Bueno: RESTful y consistente
GET    /api/usuarios              // Listar todos
GET    /api/usuarios/:id          // Obtener uno
POST   /api/usuarios              // Crear
PUT    /api/usuarios/:id          // Actualizar
DELETE /api/usuarios/:id          // Eliminar

GET    /api/categorias-profesion
POST   /api/categorias-profesion
PUT    /api/categorias-profesion/:id

// ❌ Malo: No RESTful
GET    /api/getUsuarios
POST   /api/createUsuario
GET    /api/usuario/get/:id
```

### Responses

```typescript
// ✅ Bueno: Estructura consistente
{
  "ok": true,
  "usuario": { ... },
  "timestamp": "2026-03-07T10:30:00Z"
}

{
  "ok": false,
  "msg": "Usuario no encontrado",
  "error": "No existe usuario con id: 999"
}

// ❌ Malo: Inconsistente
{
  "success": true,
  "data": { ... }
}

{
  "error": "Not found"
}
```

### Status Codes

```typescript
// ✅ Bueno: Usar códigos HTTP apropiados
200 - OK (GET, PUT exitoso)
201 - Created (POST exitoso)
204 - No Content (DELETE exitoso)
400 - Bad Request (validación fallida)
401 - Unauthorized (sin token o token inválido)
403 - Forbidden (sin permisos)
404 - Not Found (recurso no existe)
409 - Conflict (duplicado, ej: email ya existe)
500 - Internal Server Error (error del servidor)

// Ejemplo
res.status(201).json({ ok: true, usuario });
res.status(404).json({ ok: false, msg: "Usuario no encontrado" });
```

### Validaciones

```typescript
// ✅ Bueno: Validaciones en rutas
router.post(
  "/",
  validarJWT,
  [
    check("primerNombre", "El primer nombre es obligatorio").not().isEmpty(),
    check("email", "Email inválido").isEmail(),
    check(
      "categoriaProfesion_id",
      "Categoría de profesión es obligatoria",
    ).isInt(),
    validarCampos,
  ],
  crearUsuario,
);

// Validaciones adicionales en controller
export const crearUsuario = async (req: Request, res: Response) => {
  const { email, categoriaProfesion_id } = req.body;

  // Verificar email duplicado
  const existe = await Usuario.findOne({ where: { email } });
  if (existe) {
    return res.status(409).json({
      ok: false,
      msg: "El email ya está registrado",
    });
  }

  // Verificar que la categoría existe
  const categoria = await CategoriaProfesion.findByPk(categoriaProfesion_id);
  if (!categoria) {
    return res.status(400).json({
      ok: false,
      msg: "La categoría de profesión no existe",
    });
  }

  // Continuar con la creación...
};
```

---

## 🔒 Seguridad

### JWT

```typescript
// ✅ Bueno: Token con expiración y datos mínimos
const token = jwt.sign(
  {
    id: usuario.id,
    login: usuario.email,
  },
  process.env.JWT_SECRET!,
  { expiresIn: "24h" },
);

// ❌ Malo: Sin expiración o con datos sensibles
const token = jwt.sign({ usuario }, process.env.JWT_SECRET!);
```

### Passwords

```typescript
// ✅ Bueno: Hash con bcrypt
const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync(password, salt);

// Verificar
const validPassword = bcrypt.compareSync(password, usuario.password);

// ❌ Malo: Texto plano
usuario.password = password;
```

### Exclusión de Datos Sensibles

```typescript
// ✅ Bueno: Excluir campos sensibles
const usuarios = await Usuario.findAll({
  attributes: {
    exclude: ["password", "resetToken", "resetTokenExpire"],
  },
});

// ❌ Malo: Retornar todo
const usuarios = await Usuario.findAll();
```

### Variables de Entorno

```typescript
// ✅ Bueno: Usar variables de entorno
const JWT_SECRET = process.env.JWT_SECRET!;
const DB_PASSWORD = process.env.DB_PASSWORD_DEV;

// ❌ Malo: Hardcodear valores
const JWT_SECRET = "mi_secreto_123";
const DB_PASSWORD = "password123";
```

### Validación de Entrada

```typescript
// ✅ Bueno: Validar y sanitizar
const id = parseInt(req.params.id);
if (isNaN(id) || id <= 0) {
  return res.status(400).json({
    ok: false,
    msg: "ID inválido",
  });
}

// ❌ Malo: Usar sin validar
const id = req.params.id;
const usuario = await Usuario.findByPk(id);
```

---

## 🧪 Testing

### Unit Tests (Futuro)

```typescript
// Ejemplo de test unitario
describe("Usuario Controller", () => {
  describe("getUsuario", () => {
    it("debe retornar un usuario por ID", async () => {
      const req = { params: { id: "1" } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getUsuario(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        usuario: expect.any(Object),
      });
    });

    it("debe retornar 404 si el usuario no existe", async () => {
      const req = { params: { id: "999" } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        msg: expect.any(String),
      });
    });
  });
});
```

### Testing Manual

```bash
# Usar CURL o Postman para testing
# Ver docs/EJEMPLOS-CURL.md

# Test básico de endpoint
curl http://localhost:3000/api/usuarios

# Test con autenticación
curl http://localhost:3000/api/usuarios/56 \
  -H "x-token: YOUR_TOKEN"
```

---

## 📝 Documentación

### Código Documentado

```typescript
/**
 * Obtiene un usuario por ID con todas sus relaciones
 *
 * Optimizado para reducir carga de BD:
 * - Solo carga relaciones específicas (no all:true)
 * - Excluye campos sensibles (password, resetToken)
 * - Incluye permisos del usuario
 *
 * @route GET /api/usuarios/:id
 * @param req.params.id - ID del usuario a buscar
 * @returns {Object} - Usuario con sus relaciones
 * @throws {404} - Si el usuario no existe
 * @throws {500} - Si hay un error del servidor
 *
 * @example
 * // Request
 * GET /api/usuarios/56
 * x-token: YOUR_JWT_TOKEN
 *
 * // Response
 * {
 *   ok: true,
 *   usuario: {
 *     id: 56,
 *     primerNombre: "Juan",
 *     categoriaProfesion: { ... }
 *   }
 * }
 */
export const getUsuario = async (req: Request, res: Response) => {
  // Implementación
};
```

### README de Carpetas

```markdown
# src/controllers/

Contiene toda la lógica de negocio de la aplicación.

## Convenciones

- Un controller por entidad
- Exportar funciones async
- Usar try-catch para manejo de errores
- Retornar respuestas consistentes

## Archivos

- usuario.controller.ts - Gestión de usuarios
- categoriaProfesion.controller.ts - Gestión de categorías
- login.controller.ts - Autenticación
```

---

## 🎯 Checklist Pre-Commit

Antes de hacer commit, verifica:

- [ ] El código compila sin errores (`npm run build`)
- [ ] No hay errores de linting
- [ ] Las variables de entorno no están hardcodeadas
- [ ] Los console.log de debug fueron removidos
- [ ] Los comentarios están actualizados
- [ ] La documentación fue actualizada (si aplica)
- [ ] El commit message sigue la convención
- [ ] Los archivos sensibles están en .gitignore

---

## 📚 Referencias

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Sequelize Best Practices](https://sequelize.org/docs/v6/other-topics/upgrade-to-v6/)
- [REST API Best Practices](https://restfulapi.net/)

---

**¿Tienes sugerencias para mejorar estas prácticas?**  
Contacta al equipo de desarrollo.
