const { Router } = require('express');
const auditLogController = require('./auditlog.controller');
const { authMiddleware } = require('../../middlewares/auth');
const roleGuard = require('../../middlewares/roleGuard');

const router = Router();

// GET /api/audit-logs — Listar logs com filtros (apenas ADMIN)
router.get(
  '/',
  authMiddleware,
  roleGuard('ADMIN'),
  auditLogController.getLogs
);

// GET /api/audit-logs/stats — Estatísticas gerais (apenas ADMIN)
router.get(
  '/stats',
  authMiddleware,
  roleGuard('ADMIN'),
  auditLogController.getStats
);

// GET /api/audit-logs/fraud-alerts — Alertas de fraude (apenas ADMIN)
router.get(
  '/fraud-alerts',
  authMiddleware,
  roleGuard('ADMIN'),
  auditLogController.getFraudAlerts
);

module.exports = router;

