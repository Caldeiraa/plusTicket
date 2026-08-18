const paymentsService = require('./payments.service');
const { stripe } = require('../../config/stripe');
const ApiResponse = require('../../utils/apiResponse');
const logger = require('../../utils/logger');

class PaymentsController {
  async createPaymentIntent(req, res, next) {
    try {
      const { orderId, paymentMethod } = req.body;
      const result = await paymentsService.createPaymentIntent(orderId, paymentMethod, req.user.id);
      return ApiResponse.created(res, result, 'Payment Intent criado');
    } catch (error) {
      next(error);
    }
  }

  async webhook(req, res, next) {
    try {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body, // Raw body
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        logger.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      await paymentsService.handleWebhook(event);

      return res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const status = await paymentsService.getPaymentStatus(req.params.id, req.user.id);
      return ApiResponse.success(res, status);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentsController();
