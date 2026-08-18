const { z } = require('zod');

const checkInSchema = z.object({
  ticketCode: z.string().min(1, 'Código do ingresso é obrigatório'),
  gate: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

module.exports = { checkInSchema };
