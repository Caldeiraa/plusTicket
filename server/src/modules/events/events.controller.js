const eventsService = require('./events.service');
const ApiResponse = require('../../utils/apiResponse');

class EventsController {
  async create(req, res, next) {
    try {
      const event = await eventsService.create(req.body, req.user.id);
      return ApiResponse.created(res, event, 'Evento criado com sucesso');
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { events, total, page, limit } = await eventsService.list(req.query);
      return ApiResponse.paginated(res, events, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const event = await eventsService.getById(req.params.id);
      return ApiResponse.success(res, event);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const event = await eventsService.update(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, event, 'Evento atualizado com sucesso');
    } catch (error) {
      next(error);
    }
  }

  async publish(req, res, next) {
    try {
      const event = await eventsService.publish(req.params.id, req.user.id);
      return ApiResponse.success(res, event, 'Evento publicado com sucesso');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const event = await eventsService.cancel(req.params.id, req.user.id);
      return ApiResponse.success(res, event, 'Evento cancelado');
    } catch (error) {
      next(error);
    }
  }

  async getMyEvents(req, res, next) {
    try {
      const { events, total, page, limit } = await eventsService.getMyEvents(req.user.id, req.query);
      return ApiResponse.paginated(res, events, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await eventsService.getStats(req.params.id, req.user.id);
      return ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventsController();
