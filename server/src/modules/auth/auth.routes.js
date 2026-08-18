const { Router } = require('express');
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { registerSchema, loginSchema } = require('./auth.schema');

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getProfile);
router.post('/refresh', authController.refreshToken);

module.exports = router;
