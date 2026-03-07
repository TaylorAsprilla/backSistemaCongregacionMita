# Documentación de la API

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Categorías de Profesión](#categorías-de-profesión)
- [Códigos de Error](#códigos-de-error)

---

## Autenticación

Todos los endpoints (excepto login) requieren autenticación JWT mediante el header `x-token`.

### Login

```http
POST /api/login
Content-Type: application/json

{
  "login": "usuario@example.com",
  "password": "contraseña123"
}
```

**Respuesta:**

```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "entidadTipo": "usuario",
  "usuario": {
    "id": 56,
    "primerNombre": "Juan",
    "primerApellido": "Pérez",
    "categoriaProfesion": {
      "id": 12,
      "nombre": "Tecnología e ingeniería",
      "descripcion": "Profesionales de tecnología e ingeniería"
    }
  }
}
```

### Renovar Token

```http
GET /api/login/renew
x-token: YOUR_JWT_TOKEN
```

**Respuesta:** Igual que login, incluye nueva token y datos del usuario con `categoriaProfesion`.

---

## Usuarios

### Obtener un Usuario

```http
GET /api/usuarios/:id
x-token: YOUR_JWT_TOKEN
```

**Respuesta:**

```json
{
  "ok": true,
  "usuario": {
    "id": 56,
    "primerNombre": "Juan",
    "segundoNombre": "Carlos",
    "primerApellido": "Pérez",
    "segundoApellido": "García",
    "email": "juan@example.com",
    "numeroCelular": "+1787-555-0123",
    "ocupacion": "Ingeniero de Software",
    "categoriaProfesion": {
      "id": 12,
      "nombre": "Tecnología e ingeniería",
      "descripcion": "Profesionales de tecnología e ingeniería"
    },
    "genero": {
      "id": 1,
      "genero": "Masculino"
    },
    "estadoCivil": {
      "id": 1,
      "estadoCivil": "Soltero"
    },
    "usuarioPermiso": [
      {
        "id": 1,
        "permiso": "Ver informes",
        "estado": 1
      }
    ]
  }
}
```

### Crear Usuario

```http
POST /api/usuarios
x-token: YOUR_JWT_TOKEN
Content-Type: application/json

{
  "primerNombre": "Juan",
  "segundoNombre": "Carlos",
  "primerApellido": "Pérez",
  "segundoApellido": "García",
  "fechaNacimiento": "1990-05-15",
  "email": "juan.perez@example.com",
  "numeroCelular": "+1787-555-0123",
  "direccion": "Calle Principal #123",
  "ciudadDireccion": "San Juan",
  "paisDireccion": "Puerto Rico",
  "esJoven": false,
  "ocupacion": "Ingeniero de Software",
  "especializacionEmpleo": "Desarrollo Web Full Stack",
  "anoConocimiento": "2015",
  "numeroDocumento": "123456789",
  "genero_id": 1,
  "estadoCivil_id": 1,
  "rolCasa_id": 1,
  "nacionalidad_id": 1,
  "gradoAcademico_id": 5,
  "categoriaProfesion_id": 12,
  "tipoDocumento_id": 1,
  "tipoMiembro_id": 1,
  "congregacion": {
    "pais_id": 1,
    "congregacion_id": 1,
    "campo_id": 1
  }
}
```

#### Campos Obligatorios

- `primerNombre`
- `primerApellido`
- `fechaNacimiento`
- `direccion`
- `ciudadDireccion`
- `paisDireccion`
- `esJoven` (boolean)
- `genero_id`
- `estadoCivil_id`
- `rolCasa_id`
- `nacionalidad_id`
- `gradoAcademico_id`
- `categoriaProfesion_id` ⭐ **NUEVO - Obligatorio**
- `tipoMiembro_id`
- `congregacion` (objeto)

#### Campos Opcionales

- `segundoNombre`
- `segundoApellido`
- `email`
- `numeroCelular`
- `ocupacion` ⭐ **Mantenido - Texto libre para información adicional**
- `especializacionEmpleo`
- `anoConocimiento`
- `numeroDocumento`
- Y otros campos de dirección postal

### Actualizar Usuario

```http
PUT /api/usuarios/:id
x-token: YOUR_JWT_TOKEN
Content-Type: application/json

{
  "primerNombre": "Juan",
  "email": "juan.nuevo@example.com",
  "numeroCelular": "+1787-555-9999",
  "ocupacion": "Senior Software Engineer",
  "categoriaProfesion_id": 12,
  "estadoCivil_id": 2
}
```

**Nota:** En el PUT puedes enviar solo los campos que deseas actualizar.

---

## Categorías de Profesión

### Listar Todas las Categorías

```http
GET /api/categorias-profesion
x-token: YOUR_JWT_TOKEN
```

**Respuesta:**

```json
{
  "ok": true,
  "categorias": [
    {
      "id": 1,
      "nombre": "Sin Categoría Profesión",
      "descripcion": "Categoría por defecto",
      "estado": 1
    },
    {
      "id": 12,
      "nombre": "Tecnología e ingeniería",
      "descripcion": "Profesionales de tecnología e ingeniería",
      "estado": 1
    }
  ]
}
```

### Obtener una Categoría

```http
GET /api/categorias-profesion/:id
x-token: YOUR_JWT_TOKEN
```

### Crear Categoría

```http
POST /api/categorias-profesion
x-token: YOUR_JWT_TOKEN
Content-Type: application/json

{
  "nombre": "Medios y Comunicación Digital",
  "descripcion": "Profesionales de medios digitales y marketing"
}
```

**Campos:**

- `nombre` (obligatorio) - Nombre único de la categoría
- `descripcion` (opcional) - Descripción detallada

### Actualizar Categoría

```http
PUT /api/categorias-profesion/:id
x-token: YOUR_JWT_TOKEN
Content-Type: application/json

{
  "nombre": "Tecnología, Ingeniería y TI",
  "descripcion": "Profesionales de TI e ingeniería"
}
```

### Eliminar (Desactivar) Categoría

```http
DELETE /api/categorias-profesion/:id
x-token: YOUR_JWT_TOKEN
```

**Nota:** No se puede eliminar si hay usuarios asociados (ON DELETE RESTRICT).

### Activar Categoría

```http
PUT /api/categorias-profesion/activar/:id
x-token: YOUR_JWT_TOKEN
```

---

## Códigos de Error

| Código | Descripción                               |
| ------ | ----------------------------------------- |
| 200    | Operación exitosa                         |
| 400    | Solicitud incorrecta (validación fallida) |
| 401    | No autorizado (token inválido o faltante) |
| 404    | Recurso no encontrado                     |
| 500    | Error interno del servidor                |

### Formato de Error

```json
{
  "ok": false,
  "msg": "Descripción del error",
  "error": "Detalles técnicos del error"
}
```

---

## Headers Requeridos

Todos los endpoints protegidos requieren:

```
x-token: YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## Categorías de Profesión Disponibles (IDs 1-25)

| ID  | Nombre                                         |
| --- | ---------------------------------------------- |
| 1   | Sin Categoría Profesión                        |
| 2   | Estudiantes y menores                          |
| 3   | Hogar y labores del hogar                      |
| 4   | Pensionados / retirados / incapacitados        |
| 5   | Sin información / no aplica                    |
| 6   | Servicios varios / ocupación genérica          |
| 7   | Salud y sector social                          |
| 8   | Construcción, mantenimiento y oficios técnicos |
| 9   | Administración, oficina y recursos humanos     |
| 10  | Comercio, ventas y atención al cliente         |
| 11  | Educación e investigación                      |
| 12  | Tecnología e ingeniería                        |
| 13  | Transporte y logística                         |
| 14  | Contabilidad, finanzas y banca                 |
| 15  | Independiente / emprendimiento general         |
| 16  | Belleza, confección y cuidado personal         |
| 17  | Seguridad, vigilancia y fuerza pública         |
| 18  | Servicio doméstico y apoyo personal            |
| 19  | Gastronomía y alimentos                        |
| 20  | Agropecuario y medio ambiente                  |
| 21  | Desempleados                                   |
| 22  | Arte, cultura y comunicación                   |
| 23  | Legal y justicia                               |
| 24  | Religioso y ministerial                        |
| 25  | Otros específicos por revisar                  |
