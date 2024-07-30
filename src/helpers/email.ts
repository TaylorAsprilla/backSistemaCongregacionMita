import config from "../config/config";
import { transporter } from "../config/mailer";

const environment = config[process.env.NODE_ENV || "development"];
const { from, email } = environment.email;

const enviarEmail = async (to: string, subject: string, html: string) => {
  console.info("Enviando correos");

  try {
    const info = await transporter.sendMail({
      from: `${from} <${email}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.info("Cuenta de correo", info.accepted);
  } catch (error: any) {
    console.error("error?.message", error?.message);
    console.error("error?.message", error);
  }
};

export default enviarEmail;
