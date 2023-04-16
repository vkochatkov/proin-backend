const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../services/logger')

const HttpError = require('../models/http-error');
const User = require('../models/user');
const mailer = require('../nodemailer');
require('dotenv').config();

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (err) {
    const error = new HttpError(
      'Fetching users failed, please try again later.',
      500
    );
    return next(error);
  }
  res.json({ users: users.map(user => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { email, password } = req.body;
  logger.info(`POST signin up request started with credentials email: ${email}, password: ${password}`)
  
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      'User exists already, please login instead.',
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not create user, please try again.',
      500
    );
    return next(error);
  }

  const createdUser = new User({
    email,
    password: hashedPassword,
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: process.env.EXPIRES_IN }
    );
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  const message = {
    to: email,
    subject: 'Вітаємо! Ви успішно зареєструвалися на нашому сайті',
    text: `Вітаємо! Ви успішно зареєструвалися на нашому сайті
    
      Дані Вашого облікового запису:
      login: ${email}
      password: ${password}

      Даний лист не потребує відповіді
    `
  };

  mailer(message);

  res
    .status(201)
    .json({ 
      userId: createdUser.id, 
      email: createdUser.email, 
      token 
    });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  logger.info(`POST login request was successfull with email: ${email}, password: ${password}`);
  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    logger.info(`${err} status 500`)
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    logger.info(error)
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      'Could not log you in, please check your credentials and try again.',
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: process.env.EXPIRES_IN }
    );
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token
  });
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    logger.info(`існуючого користувача email:${email} не вдалося знайти, щось пішло не так, статус 500`)
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    logger.info(`існуючого користувача email:${email} не вдалося знайти, статус 403`)
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: process.env.EXPIRES_IN }
    );
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  const message = {
    to: email,
    subject: 'Відновлення паролю',
    html: `
    <div>
      <p>
        Натисни <a href="${process.env.FRONTEND_HOST}/reset-password/${token}">посилання</a> 
        щоб оновити пароль.
      </p>
      <p>
        Даний лист не потребує відповіді
      </p>
    </div>
    `
  };

  mailer(message);

  res.json('reset email message was sent successfully');
}

const resetPassword = async(req, res, next) => {
  const { token, password } = req.body;
  logger.info(`POST request resetPassword with token: ${token} password: ${password}`)

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_KEY);
  } catch (err) {
    const error = new HttpError(
      'Invalid or expired token, please try again.',
      400
    );
    return next(error);
  }

  let existingUser;
  try {
    existingUser = await User.findById(decodedToken.userId);
  } catch (err) {
    const error = new HttpError(
      'Resetting password failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Could not find a user with the provided token.',
      404
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not update password, please try again.',
      500
    );
    return next(error);
  }

  existingUser.password = hashedPassword;

  try {
    await existingUser.save();
  } catch (err) {
    const error = new HttpError(
      'Resetting password failed, please try again later.',
      500
    );
    return next(error);
  }

  let newToken;
  try {
    newToken = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: process.env.EXPIRES_IN }
    );
  } catch (err) {
    const error = new HttpError(
      'Resetting password failed, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: newToken
  });
}

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
