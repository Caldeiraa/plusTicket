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

  async getAnalytics(req, res, next) {
    try {
      const analytics = await dashboardService.getAnalytics(req.params.id, req.user.id);
      return ApiResponse.success(res, analytics, 'Analytics do evento');
    } catch (error) {
      next(error);
    }
  }

  async getGateAnalysis(req, res, next) {
    try {
      const gates = await dashboardService.getGateAnalysis(req.params.id, req.user.id);
      return ApiResponse.success(res, gates, 'Análise por portão');
    } catch (error) {
      next(error);
    }
  }

  async getInsights(req, res, next) {
    try {
      const insights = await dashboardService.getInsights(req.params.id, req.user.id);
      return ApiResponse.success(res, insights, 'Insights de vendas');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();

