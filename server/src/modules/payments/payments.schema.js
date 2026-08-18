const { z } = require('zod');

const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1, 'ID do pedido inválido'),
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO']).optional().default('CREDIT_CARD'),
});

module.exports = { createPaymentIntentSchema };
