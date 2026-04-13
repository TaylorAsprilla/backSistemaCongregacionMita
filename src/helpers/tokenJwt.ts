const jwt = require("jsonwebtoken");

/**
 * Genera un JSON Web Token (JWT) para autenticación
 *
 * El token incluye:
 * - id: Identificador del usuario o congregación
 * - login: Username/login del usuario
 * - sessionId: Identificador único de sesión para control de sesión única
 * - email: Email del usuario (opcional)
 * - iat: Fecha de emisión (issued at)
 * - exp: Fecha de expiración
 *
 * @param id - ID del usuario o entidad
 * @param login - Username o login
 * @param sessionId - Identificador único de sesión (UUID)
 * @param email - Email del usuario (opcional)
 * @param expiresIn - Tiempo de expiración (default: 12h)
 * @param jwtSecret - Secret para firmar el token
 * @returns Promise con el token generado
 */
const generarJWT = (
  id: any,
  login: string = "",
  sessionId: string,
  email: string = "",
  expiresIn = "12h",
  jwtSecret = process.env.JWT_SECRET,
) => {
  return new Promise((resolve, reject) => {
    // Payload del JWT con información de sesión
    const payload = {
      sub: id, // Subject: ID del usuario (estándar JWT)
      id, // Mantener por compatibilidad
      login,
      email,
      sessionId, // Identificador único de sesión (jti equivalente)
    };

    jwt.sign(
      payload,
      jwtSecret,
      {
        expiresIn: expiresIn,
      },
      (err: string, token: string) => {
        if (err) {
          console.error("Error al generar JWT:", err);
          reject("No se puede generar el JWT");
        } else {
          resolve(token);
        }
      },
    );
  });
};

export default generarJWT;
