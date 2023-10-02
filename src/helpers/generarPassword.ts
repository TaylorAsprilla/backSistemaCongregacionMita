import { generate } from "generate-password";

const generarPassword = () => {
  const password = generate({
    length: 10,
    numbers: true,
  });

  return password;
};

export default generarPassword;
