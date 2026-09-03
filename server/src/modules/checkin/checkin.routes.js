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

// Check-in Offline — Baixar pacote de ingressos para cache local
router.get(
  '/:eventId/offline-pack',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  checkInController.getOfflinePack
);

// Check-in Offline — Sincronizar check-ins feitos offline
router.post(
  '/:eventId/sync',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  checkInController.syncOfflineCheckIns
);

module.exports = router;

