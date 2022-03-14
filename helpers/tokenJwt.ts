const jwt = require("jsonwebtoken");

const generarJWT = (id: any, login: string = "") => {
  return new Promise((resolve, reject) => {
    const payload = {
      id,
      login,
    };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
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
