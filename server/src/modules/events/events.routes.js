const { Router } = require('express');
const eventsController = require('./events.controller');
const { authMiddleware, optionalAuth } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const roleGuard = require('../../middlewares/roleGuard');
const { createEventSchema, updateEventSchema, listEventsQuerySchema } = require('./events.schema');

const router = Router();

// Rotas públicas
router.get('/', validate(listEventsQuerySchema, 'query'), eventsController.list);
router.get('/:id', eventsController.getById);

// Rotas protegidas (Organizador)
router.post('/', authMiddleware, roleGuard('ORGANIZER', 'ADMIN'), validate(createEventSchema), eventsController.create);
router.put('/:id', authMiddleware, roleGuard('ORGANIZER', 'ADMIN'), validate(updateEventSchema), eventsController.update);
router.post('/:id/publish', authMiddleware, roleGuard('ORGANIZER', 'ADMIN'), eventsController.publish);
router.delete('/:id', authMiddleware, roleGuard('ORGANIZER', 'ADMIN'), eventsController.cancel);

// Rotas do organizador
router.get('/my/events', authMiddleware, roleGuard('ORGANIZER', 'ADMIN'), eventsController.getMyEvents);
router.get('/:id/stats', authMiddleware, roleGuard('ORGANIZER', 'ADMIN'), eventsController.getStats);

module.exports = router;
