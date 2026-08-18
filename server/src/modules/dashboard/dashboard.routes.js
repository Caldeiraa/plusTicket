const { Router } = require('express');
const dashboardController = require('./dashboard.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleGuard = require('../../middlewares/roleGuard');

const router = Router();

router.get(
  '/events/:id/live',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  dashboardController.getLiveData
);

router.get(
  '/events/:id/summary',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  dashboardController.getSummary
);

module.exports = router;
