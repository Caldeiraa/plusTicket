const { z } = require('zod');

const createEventSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(255),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  shortDesc: z.string().max(500).optional(),
  venue: z.string().min(2, 'Local é obrigatório').max(255),
  address: z.string().min(5, 'Endereço é obrigatório').max(500),
  city: z.string().min(2, 'Cidade é obrigatória').max(100),
  state: z.string().min(2, 'Estado é obrigatório').max(50),
  zipCode: z.string().max(10).optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida').optional(),
  doorsOpen: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida').optional(),
  imageUrl: z.string().url().max(500).optional(),
  capacity: z.number().int().positive('Capacidade deve ser positiva'),
  isOnline: z.boolean().optional().default(false),
  onlineUrl: z.string().url().max(500).optional(),
});

const updateEventSchema = createEventSchema.partial();

const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date', 'title', 'createdAt']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

module.exports = { createEventSchema, updateEventSchema, listEventsQuerySchema };
