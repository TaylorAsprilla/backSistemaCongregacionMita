import config from "./config";
import nodemailer from "nodemailer";

const environment = config[process.env.NODE_ENV || "development"];

export const transporter = nodemailer.createTransport({
  service: "Outlook365",
  host: "smtp.office365.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: environment.email.email, // generated ethereal user
    pass: environment.email.password, // generated ethereal password
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

transporter.verify().then(() => {
  console.log("Ready for send emails");
});
