import config from "./config";

// import nodemailer = require("nodemailer");
const nodemailer = require("nodemailer");

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: config.development.email.email, // generated ethereal user
    pass: config.development.email.password, // generated ethereal password
  },
});

transporter.verify().then(() => {
  console.log("Ready for send emails");
});
