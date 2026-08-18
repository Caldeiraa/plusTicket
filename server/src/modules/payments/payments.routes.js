const { Router } = require('express');
const paymentsController = require('./payments.controller');
const { authMiddleware } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { createPaymentIntentSchema } = require('./payments.schema');
const express = require('express');

const router = Router();

// Webhook do Stripe (precisa do raw body - configurado separadamente no app.js)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentsController.webhook);

// Rotas protegidas
router.post(
  '/create-intent',
  authMiddleware,
  validate(createPaymentIntentSchema),
  paymentsController.createPaymentIntent
);
router.get('/:id', authMiddleware, paymentsController.getStatus);

module.exports = router;
