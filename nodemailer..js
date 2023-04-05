const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport(
  {
    service: 'gmail',
    auth: {
        user: process.env.GOOGLE_USER,
        pass: process.env.GOOGLE_PASS
    }
  }, 
  {
    from: `ProIn <${process.env.GOOGLE_USER}>`,
  }
);

const mailer = (message) => {
  transporter.sendMail(message, (err, info) => {
    if (err) console.log(err);
    console.log('Email sent: ', info);
  })
}

module.exports = mailer;
