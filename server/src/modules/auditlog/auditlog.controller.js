const auditLogService = require('./auditlog.service');
const ApiResponse = require('../../utils/apiResponse');

class AuditLogController {
  /**
   * Listar audit logs com filtros (ADMIN)
   * GET /api/audit-logs?page=1&limit=50&action=CHECK_IN&severity=CRITICAL
   */
  async getLogs(req, res, next) {
    try {
      const result = await auditLogService.getLogs(req.query);
      return ApiResponse.paginated(res, result.logs, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      }, 'Logs de auditoria recuperados');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Estatísticas gerais dos logs (ADMIN)
   * GET /api/audit-logs/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await auditLogService.getStats();
      return ApiResponse.success(res, stats, 'Estatísticas de auditoria');
    } catch (error) {
      next(error);
    }
  }

  async getFraudAlerts(req, res, next) {
    try {
      const alerts = await auditLogService.getFraudAlerts();
      return ApiResponse.success(res, alerts, 'Alertas anti-fraude recuperados com sucesso');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditLogController();

