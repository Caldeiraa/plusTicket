const { Router } = require('express');
const checkInController = require('./checkin.controller');
const { authMiddleware } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const roleGuard = require('../../middlewares/roleGuard');
const { checkInSchema } = require('./checkin.schema');

const router = Router();

// Realizar check-in
router.post(
  '/',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  validate(checkInSchema),
  checkInController.checkIn
);

// Listar check-ins do evento
router.get(
  '/events/:eventId',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  checkInController.getEventCheckIns
);

module.exports = router;
