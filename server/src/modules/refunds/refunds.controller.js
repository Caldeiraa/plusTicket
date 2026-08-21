const refundsService = require('./refunds.service');
const ApiResponse = require('../../utils/apiResponse');

class RefundsController {
  async requestRefund(req, res, next) {
    try {
      const { reason } = req.body;
      const result = await refundsService.requestRefund(req.params.ticketId, req.user.id, reason);
      return ApiResponse.created(res, result, 'Reembolso processado com sucesso');
    } catch (error) {
      next(error);
    }
  }

  async getMyRefunds(req, res, next) {
    try {
      const refunds = await refundsService.getMyRefunds(req.user.id);
      return ApiResponse.success(res, refunds);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RefundsController();
