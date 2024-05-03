const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");

// a reusable class for email sending
module.exports = class Email {
  constructor(user, url) {
    (this.to = user.email),
      (this.firstName = user.name),
      (this.url = url),
      (this.from = "AdventureHub Team <joshrde2002@gmail.com>");
  }

  createTransport() {
    return nodemailer.createTransport({
      service: "gmail", // or another service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_BASED_PASS,
      },
    });
  }
  async send(template, subject) {
    //send the actual emai
    //1. render html based on pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );
    //2. define mail options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
    };
    //3. create a transport and send email
    await this.createTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      "welcome",
      "Welcome to AdventureHub, the world of adventures"
    );
  }

  async sendEmailVerification() {
    await this.send("verification", "Verify your email address");
  }

  async sendPasswordReset() {
    await this.send("passwordReset", "Reset your password");
  }
};
