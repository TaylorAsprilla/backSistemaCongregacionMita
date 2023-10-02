import config from "./config";
import nodemailer from "nodemailer";

const environment = config[process.env.NODE_ENV || "development"];

export const transporter = nodemailer.createTransport({
  service: "Outlook365",
  host: "smtp.office365.com",
  port: 587,
  pool: true,
  maxConnections: 3,
  maxMessages: 30,
  secure: false,
  auth: {
    user: environment.email.email,
    pass: environment.email.password,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

transporter.verify().then(() => {
  console.log("Ready for send emails");
});
