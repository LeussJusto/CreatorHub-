const router = require('express').Router();
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth');

const validate = require('../middleware/validate');

router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], validate, register);

router.post('/login', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], validate, login);

router.get('/me', authRequired, me);

module.exports = router;
