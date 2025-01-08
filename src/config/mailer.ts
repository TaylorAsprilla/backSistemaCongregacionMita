import config from "./config";
import nodemailer from "nodemailer";

const environment = config[process.env.NODE_ENV || "development"];
const { service, host, port, email, password } = environment.email;

export const transporter = nodemailer.createTransport({
  service,
  host,
  port,
  pool: true,
  maxConnections: 3,
  maxMessages: 30,
  secure: false,
  auth: {
    user: email,
    pass: password,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

// transporter.verify().then(() => {
//   console.info("Ready for send emails");
// });
