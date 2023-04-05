const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/users-controllers');

const router = express.Router();

router.get('/', usersController.getUsers);

router.post(
  '/signup',
  [
    check('email')
      .normalizeEmail()
      .isEmail(),
    check('password').isLength({ min: 6 })
  ],
  usersController.signup
);

router.post('/login', 
  [
    check('email')
      .normalizeEmail()
      .isEmail(),
    check('password').isLength({ min: 6 })
  ],
  usersController.login
);

router.post('/forgot-password', [
    check('email')
      .normalizeEmail()
      .isEmail(),
  ],
  usersController.forgotPassword
);

router.post('/reset-password', [
    check('password').isLength({ min: 6 })
  ],
  usersController.resetPassword
)

module.exports = router;
