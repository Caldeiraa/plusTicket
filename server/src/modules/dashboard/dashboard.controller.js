const dashboardService = require('./dashboard.service');
const ApiResponse = require('../../utils/apiResponse');

class DashboardController {
  async getLiveData(req, res, next) {
    try {
      const data = await dashboardService.getLiveData(req.params.id, req.user.id);
      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req, res, next) {
    try {
      const summary = await dashboardService.getSummary(req.params.id, req.user.id);
      return ApiResponse.success(res, summary);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
