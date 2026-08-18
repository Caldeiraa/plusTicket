const { Router } = require('express');
const ticketsController = require('./tickets.controller');
const { authMiddleware } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const roleGuard = require('../../middlewares/roleGuard');
const { createTicketTypeSchema, purchaseTicketsSchema } = require('./tickets.schema');

const router = Router();

// Tipos de ingresso
router.post(
  '/events/:eventId/ticket-types',
  authMiddleware,
  roleGuard('ORGANIZER', 'ADMIN'),
  validate(createTicketTypeSchema),
  ticketsController.createTicketType
);
router.get('/events/:eventId/ticket-types', ticketsController.getTicketTypes);

// Compra
router.post('/purchase', authMiddleware, validate(purchaseTicketsSchema), ticketsController.purchase);

// Meus ingressos
router.get('/my-tickets', authMiddleware, ticketsController.getMyTickets);

// Transferências de Ingressos
router.get('/transfers/pending', authMiddleware, ticketsController.getPendingTransfers);
router.post('/:id/transfer', authMiddleware, ticketsController.initiateTransfer);
router.post('/transfers/:id/accept', authMiddleware, ticketsController.acceptTransfer);
router.post('/transfers/:id/cancel', authMiddleware, ticketsController.cancelTransfer);

// Detalhes / PDF
router.get('/:id', authMiddleware, ticketsController.getById);
router.get('/:id/pdf', authMiddleware, ticketsController.downloadPDF);

module.exports = router;
