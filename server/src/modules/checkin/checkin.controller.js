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
}

module.exports = new CheckInController();
