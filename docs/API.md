# Documentación de la API

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Acceso QR verificado](#acceso-qr-verificado)
- [Usuarios](#usuarios)
- [Categorías de Profesión](#categorías-de-profesión)
- [Códigos de Error](#códigos-de-error)

---

## Autenticación

Los endpoints protegidos requieren autenticación JWT mediante el header `x-token`.
Login y los dos pasos públicos de acceso QR descritos abajo no requieren una sesión previa.

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

## Acceso QR verificado

### Solicitar código

`POST /api/accesoqr/solicitarCodigo` recibe:

```json
{
  "qrCode": "ticket-del-qr",
  "numeroMita": "123"
}
```

Requiere QR y congregación activos. Para un usuario censado y activo con correo
registrado, envía un código de seis dígitos a ese correo, nunca a una dirección
proporcionada por el visitante. La respuesta no expone nombre, correo ni existencia
del usuario:

```json
{
  "ok": true,
  "desafio_id": "uuid-del-desafio",
  "msg": "Si los datos permiten el acceso, recibirá un código en el correo registrado. Puede solicitar hasta 3 códigos cada 15 minutos."
}
```

Para una identidad inexistente, inactiva, sin correo o limitada devuelve el mismo
formato con un identificador sin desafío válido. No garantiza igualdad de tiempos
de respuesta. Un fallo de procesamiento o correo devuelve 503; no emite una sesión.

El código dura diez minutos, admite cinco intentos fallidos y solo puede consumirse
una vez. Se permiten tres solicitudes por usuario cada quince minutos, con contador
persistente y bloqueo transaccional. En MySQL se guarda únicamente su resumen HMAC,
vinculado al desafío y firmado con `JWT_SECRET`, no el código en texto.
El formulario informa la cuota y la duración de cuatro horas de la sesión antes
y después de solicitar el código. El correo usa la plantilla
`src/templates/codigoAccesoQr.html`, con el logo configurado en `imagenEmail`,
tipografía, firma y contacto de los correos existentes; incluye ambas condiciones
y el vencimiento del código. `copy-templates` la incorpora al build.

### Verificar e ingresar

`POST /api/accesoqr/loginQr` recibe:

```json
{
  "qrCode": "ticket-del-qr",
  "desafio_id": "uuid-del-desafio",
  "codigo": "012345",
  "esGuarda": true,
  "enTurnoGuarda": true,
  "puesto": "Casa Nueva"
}
```

`esGuarda` y `enTurnoGuarda` son booleanos obligatorios. Si no es guarda, el turno
debe ser `false`. Solo un guarda en turno debe seleccionar un puesto:
`Puesto 1`, `Casa Nueva`, `Finca de Arecibo` o `Finca de Bayamón`.
En los demás casos `puesto` debe ser nulo o vacío.
Un guarda fuera de turno (`esGuarda=true`, `enTurnoGuarda=false`) no puede ingresar
mediante QR: el formulario informa la restricción y deshabilita el ingreso; el
backend devuelve 403 y audita `GUARDA_FUERA_DE_TURNO`, sin crear sesión, consumir
el código ni incrementar intentos fallidos del código. Quien no es guarda puede
continuar con la verificación. El ingreso con contraseña no cambia.

El backend verifica nuevamente usuario, QR y congregación activos. La sesión QR,
el consumo del desafío y la auditoría exitosa se confirman en una misma
transacción; una falla revierte los tres. El nombre procede del censo, no del
formulario. La respuesta contiene `ok`, `token`, `nombre`, `congregacion`
(`id`, `congregacion`) y `sessionInfo` (`sessionId`, `sessionType`,
`isLoginCodeQr`, `expiresAt`).

Las nuevas sesiones QR duran **cuatro horas**, sin cerrar otras sesiones.
La renovación de JWT no extiende la expiración persistida de la sesión.
Datos mal formados devuelven 400, una verificación rechazada 401 y un fallo
interno 500. Los rechazos incluyen `code` y un `msg` visible en el formulario:
`CODIGO_VENCIDO`, `CODIGO_UTILIZADO` y `CODIGO_BLOQUEADO` indican que debe pulsar
«Solicitar otro código / cambiar número». `CODIGO_NO_VALIDO` informa los intentos
restantes y pide revisar el correo correspondiente a esta solicitud; el quinto
fallo ya devuelve bloqueo. El estado específico solo se informa si el desafío
corresponde al QR activo enviado; los desconocidos o ajenos conservan el mensaje
genérico `DESAFIO_NO_DISPONIBLE`. No cambia la caducidad ni el consumo del código.
Los límites adicionales por IP son 20 solicitudes de código y
30 verificaciones cada quince minutos; son locales al proceso y devuelven 429.
Los rechazos del limitador se registran en el log del servidor; los intentos que
llegan al controlador se guardan en la auditoría QR.

### Administración y auditoría

`GET /api/accesoqr/ultimoQr`, `POST /api/accesoqr/generarQr`,
`GET /api/accesoqr/listadoAccesos` y la consulta
`GET /api/usuarios/buscarnumeromita` requieren `x-token`, sesión normal de usuario
activo y un permiso activo existente: administrador (1), asistente OOTS (8) o
comité rector (13). Una sesión QR o de congregación no sirve para administrar.

La generación y la consulta del último QR componen la imagen con el escudo local
`src/assets/imagenes/logo.png`, incluido en el build por `copy-assets`.
No descargan el logo desde `cmar.live` ni requieren DNS o Internet para componer
la imagen. La URL de ingreso del QR sigue usando `loginPorQr` de la configuración;
`logoQR` ya no se utiliza en estos dos endpoints. Si el recurso local falta o
no puede procesarse, se registra el error y la operación devuelve 500.

El listado acepta `page` (desde 1), `limit` (1 a 100), `esGuarda=true|false`
y `esCuidadora=true|false`. Todos los filtros se combinan antes de contar y
paginar. Conserva la respuesta
`{ok, msg, data, pagination}` y consulta directamente `qrAccesos`, sin atribuir
identidad mediante coincidencias de IP. Registra solicitudes, verificaciones y
rechazos con fecha, IP, dispositivo, resultado e identidad verificada o pendiente.
Las respuestas de guarda y puesto son declaraciones del visitante, no prueba de
su cargo. Los registros históricos no reciben valores inferidos.

Cada acceso incluye `ubicacion: { ciudad, pais } | null`, con la última ubicación
almacenada en `ubicacionConexion` para su IP. Es una ubicación aproximada, no
una ubicación física verificada ni necesariamente la del momento del acceso.
La consulta del listado no envía IP a servicios externos; si no existen datos,
devuelve `null` y la tabla muestra "Sin registro". No cambia el total paginado.
La tabla muestra Usuario, Dispositivo, Ubicación, Acceso de, Puesto, Resultado,
Identidad, Motivo de rechazo y Fecha. "Acceso de" distingue Guarda, Cuidadora,
Otro (ambas respuestas negativas) y Sin registro (sin declaración suficiente).

Filtros adicionales de `GET /api/accesoqr/listadoAccesos`:

| Parámetro | Valores / comportamiento |
|-----------|--------------------------|
| `usuario` | Parte del nombre o número Mita exacto, con o sin `#` y separadores de miles. `No verificada` busca nombres ausentes. |
| `dispositivo` | Parte del dispositivo. `Sin registro` busca datos ausentes. |
| `ubicacion` | Parte de la ciudad/país de la última ubicación almacenada para la IP. `Sin registro` busca ubicaciones ausentes. |
| `accesoDe` | `guarda`, `cuidadora`, `otro`, `sin_registro`, según el mismo criterio de la tabla. |
| `puesto` | Parte del puesto actual o, si falta, `tipoPuesto` histórico. `Sin registro` busca ambos ausentes. |
| `resultado` | `EXITOSO`, `RECHAZADO`, `CODIGO_SOLICITADO`, `HISTORICO` (nulo/vacío). |
| `identidad` | `VERIFICADA`, `NO_VERIFICADA`, `PENDIENTE`, `SIN_REGISTRO` (nulo/vacío). |
| `motivoRechazo` | Parte del motivo. `Sin registro` busca motivos ausentes (mostrados como `—`). |
| `fechaDesde` | Instante ISO UTC inclusivo, por ejemplo `2026-10-01T04:00:00.000Z`. |
| `fechaHasta` | Instante ISO UTC exclusivo, posterior a `fechaDesde`. |

Los textos tienen un máximo de 150 caracteres; `%`, `_` y `!` se buscan
literalmente. Valores inválidos, repetidos o rangos invertidos devuelven 400.
Omitir un filtro incluye todos sus valores. El formulario aplica con
"Aplicar filtros" y mantiene los criterios aplicados durante la paginación,
aunque se editen los controles. "Limpiar filtros" restaura el listado completo.
Las fechas del formulario corresponden a días locales completos: la fecha
final se convierte al inicio del día siguiente antes de enviarla al API.

### Despliegue y conservación

1. Respaldar la base y aplicar una sola vez
   [012-acceso-qr-verificacion.sql](../migrations/012-acceso-qr-verificacion.sql)
   antes del nuevo backend. MySQL confirma los cambios DDL por separado; revisar
   cualquier aplicación parcial antes de reintentar, sin eliminar tablas.
2. Desplegar backend y frontend coordinadamente: el antiguo ingreso basado
   únicamente en número Mita y nombre ya no se acepta. No cambia la URL del QR.
3. Confirmar configuración del correo y `JWT_SECRET`; probar la entrega con una
   cuenta de prueba autorizada. El código nunca se registra en la auditoría.
4. Verificar ingreso con código, rechazo por caducidad/reutilización, controles
   administrativos y acceso normal con contraseña.

La migración añade `desafioAccesoQr` y campos opcionales en `qrAccesos`; permite
nulos en QR/nombre para auditar intentos no identificados y amplía el nombre a
255 caracteres. No actualiza filas históricas ni sesiones existentes.
Los cambios no activan geocercas, GPS ni restricciones por ubicación. La ubicación
por IP continúa siendo información auxiliar, no una prueba de presencia física.

No hay purga automática nueva. Programar, mediante el mantenimiento existente y
con la política de retención aprobada, la eliminación de desafíos ya caducados
con más de 24 horas desde su expiración. No purgar desafíos vigentes: el recuento
reciente también protege la cuota por usuario. El historial `qrAccesos` se
conserva de forma independiente según la política de auditoría.

### Pruebas focalizadas

Backend, desde la raíz del proyecto:

```powershell
npm run build
.\node_modules\.bin\tsc.cmd -p tsconfig.test.json
node --test build-test\tests\acceso-qr.test.js tests\acceso-qr-controller.test.cjs tests\acceso-qr-permisos.test.cjs
```

Frontend, desde su propia raíz:

```powershell
.\node_modules\.bin\ng.cmd test --watch=false --browsers=ChromeHeadless --ts-config=tsconfig.qr.spec.json --include=src/app/auth/login/login.component.spec.ts --include=src/app/pages/accesosQr/listado-accesos-qr/listado-accesos-qr.component.spec.ts
```

Los controladores se prueban con correo y transacciones simulados; no envían
mensajes reales ni reemplazan la prueba de entrega y concurrencia en el entorno.

---

## Usuarios

### Congregaciones a cargo de un obrero

`GET /api/usuarios/:id/responsabilidades-obrero` requiere `x-token` y devuelve
`{ "ok": true, "responsabilidades": [] }`. Cada responsabilidad contiene `id`,
`nombre`, `tipo` (`PAIS`, `CIUDAD`, `CAMPO`), `rol` (`PRINCIPAL`, `SEGUNDO`) y
`activo`. Incluye unidades activas e inactivas. Se consulta el encargado principal
y segundo de las unidades, no la congregación de pertenencia del usuario ni sus
permisos. País solo dispone de encargado principal.

La página Asignar Permisos muestra estas responsabilidades al seleccionar un
usuario, incluso si todavía no tiene credenciales de acceso. Un ID inválido
devuelve 400, un usuario inexistente 404 y un fallo de consulta 500.
Las asignaciones se muestran junto a Congregación y Contacto en el bloque
«Congregación a cargo», agrupadas por país, ciudad y campo; los niveles sin
responsabilidades muestran «Sin asignación». Las tres tarjetas comparten una
fila en pantallas amplias y se reorganizan en pantallas pequeñas.
Si el usuario no tiene ninguna responsabilidad, se oculta «Congregación a cargo»
y se mantienen las dos columnas de Congregación y Contacto. Los estados de carga
y error de consulta permanecen visibles para no confundir un fallo con la ausencia
de asignaciones.

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
