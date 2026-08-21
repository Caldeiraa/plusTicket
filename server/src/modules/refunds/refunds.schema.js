const { z } = require('zod');

const requestRefundSchema = z.object({
  reason: z.string().max(500, 'Motivo deve ter no máximo 500 caracteres').optional(),
});

module.exports = { requestRefundSchema };
