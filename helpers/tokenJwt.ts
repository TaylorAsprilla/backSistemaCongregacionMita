const jwt = require("jsonwebtoken");

const generarJWT = (
  id: any,
  login: string = "",
  expiresIn = "12h",
  jwtSecret = process.env.JWT_SECRET
) => {
  return new Promise((resolve, reject) => {
    const payload = {
      id,
      login,
    };
    jwt.sign(
      payload,
      jwtSecret,
      {
        expiresIn: expiresIn,
      },
      (err: string, token: string) => {
        if (err) {
          console.log(err);
          reject("No se puede generar el JWT");
        } else {
          resolve(token);
        }
      }
    );
  });
};

export default generarJWT;
