import config from "../config/config";
import { transporter } from "../config/mailer";

const enviarEmail = (to: string, subject: string, html: string) => {
  transporter.sendMail(
    {
      from: `"CMAR Multimedia" <${config.development.email.email}>`,
      to: to,
      subject: subject,
      html: html,
    },
    (error, info) => {
      console.log("Enviando correos");
      console.log("Correo", info.accepted);
      console.log("error?.message", error?.message);
      console.log("error?.message", error);
    }
  );
};

export default enviarEmail;
