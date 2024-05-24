import config from "../config/config";
import { transporter } from "../config/mailer";

const environment = config[process.env.NODE_ENV || "development"];
const { from, email } = environment.email;

const enviarEmail = (to: string, subject: string, html: string) => {
  transporter.sendMail(
    {
      from: `${from} <${email}>`,
      to: to,
      subject: subject,
      html: html,
    },
    (error, info) => {
      console.info("Enviando correos");
      console.info("Cuenta de correo", info.accepted);
      console.info("error?.message", error?.message);
      console.info("error?.message", error);
    }
  );
};

export default enviarEmail;
