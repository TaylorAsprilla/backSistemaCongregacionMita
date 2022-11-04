import { transporter } from "../config/mailer";

const enviarEmail = (to: string, subject: string, html: string) => {
  transporter.sendMail({
    from: '"CMA Multimedia" <taylor.asprilla@gmail.com>',
    to: to,
    subject: subject,
    html: html,
  });
};

export default enviarEmail;
