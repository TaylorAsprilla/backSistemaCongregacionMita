# Ejemplos de CURL - API Testing

Esta guía contiene ejemplos prácticos de CURL para probar todos los endpoints de la API.

## 🔑 Autenticación

### 1. Login

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "usuario@example.com",
    "password": "contraseña123"
  }'
```

**Respuesta esperada:**

```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "entidadTipo": "usuario",
  "usuario": { ... }
}
```

### 2. Renovar Token

```bash
curl -X GET http://localhost:3000/api/login/renew \
  -H "x-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 👤 Usuarios

### 3. Obtener Usuario por ID

```bash
curl -X GET http://localhost:3000/api/usuarios/56 \
  -H "x-token: YOUR_JWT_TOKEN"
```

### 4. Listar Todos los Usuarios

```bash
curl -X GET http://localhost:3000/api/usuarios \
  -H "x-token: YOUR_JWT_TOKEN"
```

### 5. Crear Usuario

```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_JWT_TOKEN" \
  -d '{
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
  }'
```

### 6. Actualizar Usuario

```bash
curl -X PUT http://localhost:3000/api/usuarios/56 \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_JWT_TOKEN" \
  -d '{
    "primerNombre": "Juan",
    "email": "juan.nuevo@example.com",
    "numeroCelular": "+1787-555-9999",
    "ocupacion": "Senior Software Engineer",
    "categoriaProfesion_id": 12,
    "estadoCivil_id": 2
  }'
```

---

## 📋 Categorías de Profesión

### 7. Listar Todas las Categorías

```bash
curl -X GET http://localhost:3000/api/categorias-profesion \
  -H "x-token: YOUR_JWT_TOKEN"
```

**Respuesta esperada:**

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

### 8. Obtener Categoría por ID

```bash
curl -X GET http://localhost:3000/api/categorias-profesion/12 \
  -H "x-token: YOUR_JWT_TOKEN"
```

### 9. Crear Nueva Categoría

```bash
curl -X POST http://localhost:3000/api/categorias-profesion \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_JWT_TOKEN" \
  -d '{
    "nombre": "Medios y Comunicación Digital",
    "descripcion": "Profesionales de medios digitales, redes sociales y marketing digital"
  }'
```

### 10. Actualizar Categoría

```bash
curl -X PUT http://localhost:3000/api/categorias-profesion/12 \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_JWT_TOKEN" \
  -d '{
    "nombre": "Tecnología, Ingeniería y TI",
    "descripcion": "Profesionales de tecnología de la información e ingeniería"
  }'
```

### 11. Eliminar (Desactivar) Categoría

```bash
curl -X DELETE http://localhost:3000/api/categorias-profesion/25 \
  -H "x-token: YOUR_JWT_TOKEN"
```

**Nota:** No se puede eliminar si hay usuarios asociados.

### 12. Activar Categoría

```bash
curl -X PUT http://localhost:3000/api/categorias-profesion/activar/25 \
  -H "x-token: YOUR_JWT_TOKEN"
```

---

## 🧪 Casos de Prueba

### Caso 1: Flujo Completo - Login y Obtener Usuario

```bash
# Paso 1: Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"login":"usuario@example.com","password":"contraseña123"}' \
  | jq -r '.token')

# Paso 2: Usar el token para obtener usuario
curl -X GET http://localhost:3000/api/usuarios/56 \
  -H "x-token: $TOKEN"
```

### Caso 2: Crear Usuario con Categoría

```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_JWT_TOKEN" \
  -d '{
    "primerNombre": "María",
    "primerApellido": "González",
    "fechaNacimiento": "1995-08-20",
    "direccion": "Av. Principal 456",
    "ciudadDireccion": "Ponce",
    "paisDireccion": "Puerto Rico",
    "esJoven": false,
    "ocupacion": "Doctora",
    "categoriaProfesion_id": 7,
    "genero_id": 2,
    "estadoCivil_id": 1,
    "rolCasa_id": 1,
    "nacionalidad_id": 1,
    "gradoAcademico_id": 6,
    "tipoDocumento_id": 1,
    "tipoMiembro_id": 1,
    "congregacion": {
      "pais_id": 1,
      "congregacion_id": 2,
      "campo_id": 1
    }
  }'
```

### Caso 3: Actualizar Categoría de Usuario

```bash
curl -X PUT http://localhost:3000/api/usuarios/56 \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_JWT_TOKEN" \
  -d '{
    "categoriaProfesion_id": 11,
    "ocupacion": "Profesor Universitario de Matemáticas"
  }'
```

### Caso 4: Listar Usuarios con Filtro (si está implementado)

```bash
curl -X GET "http://localhost:3000/api/usuarios?limit=10&offset=0" \
  -H "x-token: YOUR_JWT_TOKEN"
```

---

## ❌ Casos de Error

### Error 401: Token Inválido

```bash
curl -X GET http://localhost:3000/api/usuarios/56 \
  -H "x-token: token_invalido"
```

**Respuesta:**

```json
{
  "ok": false,
  "msg": "Token no válido"
}
```

### Error 400: Validación Fallida

```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_JWT_TOKEN" \
  -d '{
    "primerNombre": "Juan"
  }'
```

**Respuesta:**

```json
{
  "ok": false,
  "msg": "Error de validación",
  "errors": [
    {
      "msg": "El campo es obligatorio",
      "param": "primerApellido"
    }
  ]
}
```

### Error 404: Usuario No Encontrado

```bash
curl -X GET http://localhost:3000/api/usuarios/99999 \
  -H "x-token: YOUR_JWT_TOKEN"
```

**Respuesta:**

```json
{
  "ok": false,
  "msg": "No existe un usuario con el id: 99999"
}
```

---

## 🔧 Windows PowerShell

Si usas PowerShell en Windows, usa este formato:

### Login con PowerShell

```powershell
$body = @{
    login = "usuario@example.com"
    password = "contraseña123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### GET con Token en PowerShell

```powershell
$token = "YOUR_JWT_TOKEN"

Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/56" `
  -Method GET `
  -Headers @{"x-token"=$token}
```

---

## 📝 Variables de Entorno

Para facilitar las pruebas, puedes exportar variables:

### Bash/Linux/Mac

```bash
export API_URL="http://localhost:3000"
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Luego usar así:
curl -X GET $API_URL/api/usuarios/56 \
  -H "x-token: $TOKEN"
```

### Windows CMD

```cmd
set API_URL=http://localhost:3000
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

curl -X GET %API_URL%/api/usuarios/56 ^
  -H "x-token: %TOKEN%"
```

---

## 🎯 Tips de Uso

### 1. Formatear JSON con jq

```bash
curl -X GET http://localhost:3000/api/categorias-profesion \
  -H "x-token: YOUR_JWT_TOKEN" | jq
```

### 2. Guardar Respuesta en Archivo

```bash
curl -X GET http://localhost:3000/api/usuarios/56 \
  -H "x-token: YOUR_JWT_TOKEN" \
  -o usuario56.json
```

### 3. Ver Headers de Respuesta

```bash
curl -i -X GET http://localhost:3000/api/usuarios/56 \
  -H "x-token: YOUR_JWT_TOKEN"
```

### 4. Modo Verbose (Debug)

```bash
curl -v -X GET http://localhost:3000/api/usuarios/56 \
  -H "x-token: YOUR_JWT_TOKEN"
```

---

## 📊 Scripts de Automatización

### Script para Probar Todos los Endpoints

```bash
#!/bin/bash

# Configuración
API_URL="http://localhost:3000"
LOGIN="usuario@example.com"
PASSWORD="contraseña123"

echo "=== Testing API ==="

# 1. Login
echo "1. Testing Login..."
TOKEN=$(curl -s -X POST $API_URL/api/login \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Login successful"

# 2. Get Usuario
echo "2. Testing Get Usuario..."
RESPONSE=$(curl -s -X GET $API_URL/api/usuarios/56 \
  -H "x-token: $TOKEN")
echo $RESPONSE | jq '.'
echo "✅ Get Usuario successful"

# 3. Get Categorías
echo "3. Testing Get Categorías..."
RESPONSE=$(curl -s -X GET $API_URL/api/categorias-profesion \
  -H "x-token: $TOKEN")
echo $RESPONSE | jq '.categorias | length'
echo "✅ Get Categorías successful"

echo ""
echo "=== All tests completed ==="
```

---

## 🔗 Referencias

- [API Documentation](API.md) - Documentación completa
- [Database Schema](DATABASE.md) - Estructura de BD
- [Architecture](ARQUITECTURA.md) - Arquitectura del sistema

---

**Última actualización:** Marzo 2026  
**Versión:** 1.1.0
