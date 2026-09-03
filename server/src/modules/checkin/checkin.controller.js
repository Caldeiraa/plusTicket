const checkInService = require('./checkin.service');
const ApiResponse = require('../../utils/apiResponse');

class CheckInController {
  async checkIn(req, res, next) {
    try {
      const checkedBy = req.user?.name || 'Sistema';
      const result = await checkInService.checkIn(req.body, checkedBy);
      return ApiResponse.success(res, result, 'Check-in realizado com sucesso');
    } catch (error) {
      next(error);
    }
  }

  async getEventCheckIns(req, res, next) {
    try {
      const { checkIns, total, page, limit } = await checkInService.getEventCheckIns(
        req.params.eventId,
        req.user.id,
        req.query
      );
      return ApiResponse.paginated(res, checkIns, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async getOfflinePack(req, res, next) {
    try {
      const pack = await checkInService.getOfflinePack(req.params.eventId, req.user.id);
      return ApiResponse.success(res, pack, 'Pacote offline gerado');
    } catch (error) {
      next(error);
    }
  }

  async syncOfflineCheckIns(req, res, next) {
    try {
      const { checkIns } = req.body;
      if (!Array.isArray(checkIns) || checkIns.length === 0) {
        return ApiResponse.badRequest(res, 'Envie um array de check-ins para sincronizar');
      }
      const result = await checkInService.syncOfflineCheckIns(
        req.params.eventId,
        checkIns,
        req.user.id,
        req.user.name
      );
      return ApiResponse.success(res, result, 'Sincronização concluída');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CheckInController();

