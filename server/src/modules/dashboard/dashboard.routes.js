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

// Novos endpoints — Fase 1
router.get(
  '/events/:id/analytics',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  dashboardController.getAnalytics
);

router.get(
  '/events/:id/gates',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  dashboardController.getGateAnalysis
);

router.get(
  '/events/:id/insights',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  dashboardController.getInsights
);

module.exports = router;

