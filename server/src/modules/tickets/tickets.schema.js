const { z } = require('zod');

const createTicketTypeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Preço não pode ser negativo'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  maxPerUser: z.number().int().positive().optional().default(5),
  salesStart: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida').optional(),
  salesEnd: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida').optional(),
});

const purchaseTicketsSchema = z.object({
  eventId: z.string().min(1, 'ID do evento inválido'),
  items: z.array(z.object({
    ticketTypeId: z.string().min(1, 'ID do tipo de ingresso inválido'),
    quantity: z.number().int().positive('Quantidade deve ser positiva').max(10, 'Máximo 10 por tipo'),
    holderName: z.string().min(2).max(255).optional(),
    holderEmail: z.string().email('E-mail inválido').optional(),
    holderDoc: z.string().max(20).optional().nullable(),
  })).min(1, 'Selecione ao menos um ingresso'),
  holderName: z.string().min(2, 'Nome do titular deve ter no mínimo 2 caracteres').max(255).optional(),
  holderEmail: z.string().email('E-mail do titular inválido').optional(),
  holderDoc: z.string().max(20).optional().nullable(),
  paymentMethod: z.string().optional(),
});

module.exports = { createTicketTypeSchema, purchaseTicketsSchema };
