const { Router } = require('express');
const refundsController = require('./refunds.controller');
const { authMiddleware } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { requestRefundSchema } = require('./refunds.schema');

const router = Router();

// Listar meus reembolsos
router.get('/my-refunds', authMiddleware, refundsController.getMyRefunds);

// Solicitar devolução de um ingresso
router.post(
  '/:ticketId',
  authMiddleware,
  validate(requestRefundSchema),
  refundsController.requestRefund
);

module.exports = router;
