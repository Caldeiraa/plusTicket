const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Serviço de AuditLog — registra ações críticas do sistema
 * Usado para segurança, anti-fraude e conformidade LGPD
 */
class AuditLogService {
  /**
   * Registrar uma ação no audit log
   * @param {Object} data
   * @param {string} data.action - Tipo da ação (CHECK_IN, PURCHASE, REFUND, etc.)
   * @param {string} data.entityType - Tipo da entidade (TICKET, EVENT, ORDER, etc.)
   * @param {string} [data.entityId] - ID da entidade afetada
   * @param {string} [data.userId] - ID do usuário que executou a ação
   * @param {string} [data.userName] - Nome do usuário
   * @param {string} [data.details] - Descrição legível da ação
   * @param {Object} [data.metadata] - Dados extras em JSON
   * @param {string} [data.severity] - INFO, WARNING ou CRITICAL
   * @param {Object} [req] - Objeto request do Express (para IP e User-Agent)
   */
  async log(data, req = null) {
    try {
      const logEntry = await prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId || null,
          userId: data.userId || null,
          userName: data.userName || null,
          details: data.details || null,
          metadata: data.metadata || null,
          severity: data.severity || 'INFO',
          ipAddress: req ? (req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress) : null,
          userAgent: req ? (req.headers['user-agent'] || null) : null,
        },
      });

      // Logar também no Winston para persistência em arquivo
      const logLevel = data.severity === 'CRITICAL' ? 'error' : data.severity === 'WARNING' ? 'warn' : 'info';
      logger[logLevel](`[AUDIT] ${data.action} | ${data.entityType}:${data.entityId || '-'} | User:${data.userId || 'system'} | ${data.details || ''}`);

      return logEntry;
    } catch (err) {
      // AuditLog nunca deve derrubar a operação principal
      logger.error('Falha ao registrar AuditLog:', err.message);
      return null;
    }
  }

  /**
   * Atalhos para ações comuns
   */
  async logCheckIn(ticket, userId, userName, req) {
    return this.log({
      action: 'CHECK_IN',
      entityType: 'TICKET',
      entityId: ticket.id,
      userId,
      userName,
      details: `Check-in realizado: ${ticket.code} - ${ticket.holderName || 'N/A'}`,
      metadata: { ticketCode: ticket.code, eventId: ticket.eventId, gate: ticket.gate },
      severity: 'INFO',
    }, req);
  }

  async logFraudAttempt(ticketCode, reason, userId, req) {
    return this.log({
      action: 'FRAUD_ATTEMPT',
      entityType: 'TICKET',
      entityId: null,
      userId,
      details: `Tentativa de fraude detectada: ${reason} (Código: ${ticketCode})`,
      metadata: { ticketCode, reason },
      severity: 'CRITICAL',
    }, req);
  }

  async logPurchase(order, userId, userName, req) {
    return this.log({
      action: 'PURCHASE',
      entityType: 'ORDER',
      entityId: order.id,
      userId,
      userName,
      details: `Pedido ${order.orderNumber} confirmado - R$ ${order.finalAmount}`,
      metadata: { orderNumber: order.orderNumber, amount: order.finalAmount, eventId: order.eventId },
      severity: 'INFO',
    }, req);
  }

  async logRefund(refund, ticket, userId, userName, req) {
    return this.log({
      action: 'REFUND',
      entityType: 'REFUND',
      entityId: refund.id,
      userId,
      userName,
      details: `Reembolso de ${refund.refundPercent}% processado para ingresso ${ticket.code} - R$ ${refund.refundAmount}`,
      metadata: { ticketCode: ticket.code, percent: refund.refundPercent, amount: refund.refundAmount },
      severity: 'WARNING',
    }, req);
  }

  async logTransfer(transfer, senderId, senderName, receiverEmail, req) {
    return this.log({
      action: 'TRANSFER',
      entityType: 'TRANSFER',
      entityId: transfer.id,
      userId: senderId,
      userName: senderName,
      details: `Transferência de ingresso iniciada para ${receiverEmail}`,
      metadata: { ticketId: transfer.ticketId, receiverEmail },
      severity: 'INFO',
    }, req);
  }

  async logEventCreate(event, userId, userName, req) {
    return this.log({
      action: 'EVENT_CREATE',
      entityType: 'EVENT',
      entityId: event.id,
      userId,
      userName,
      details: `Evento criado: "${event.title}"`,
      metadata: { title: event.title, date: event.date, capacity: event.capacity },
      severity: 'INFO',
    }, req);
  }

  async logEventUpdate(event, changes, userId, userName, req) {
    return this.log({
      action: 'EVENT_UPDATE',
      entityType: 'EVENT',
      entityId: event.id,
      userId,
      userName,
      details: `Evento "${event.title}" atualizado`,
      metadata: { changes },
      severity: 'INFO',
    }, req);
  }

  async logPriceChange(ticketType, oldPrice, newPrice, userId, userName, req) {
    return this.log({
      action: 'PRICE_CHANGE',
      entityType: 'TICKET_TYPE',
      entityId: ticketType.id,
      userId,
      userName,
      details: `Preço do lote "${ticketType.name}" alterado de R$ ${oldPrice} para R$ ${newPrice}`,
      metadata: { oldPrice, newPrice, ticketTypeName: ticketType.name },
      severity: 'WARNING',
    }, req);
  }

  async logLogin(userId, userName, email, req) {
    return this.log({
      action: 'LOGIN',
      entityType: 'USER',
      entityId: userId,
      userId,
      userName,
      details: `Login realizado: ${email}`,
      severity: 'INFO',
    }, req);
  }

  /**
   * Listar logs com filtros e paginação (para painel ADMIN)
   */
  async getLogs(query = {}) {
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      severity,
      userId,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;

    const where = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (severity) where.severity = severity;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Estatísticas do AuditLog (para dashboard ADMIN)
   */
  async getStats() {
    const [
      totalLogs,
      criticalCount,
      warningCount,
      fraudAttempts,
      recentCritical,
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { severity: 'CRITICAL' } }),
      prisma.auditLog.count({ where: { severity: 'WARNING' } }),
      prisma.auditLog.count({ where: { action: 'FRAUD_ATTEMPT' } }),
      prisma.auditLog.findMany({
        where: { severity: 'CRITICAL' },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalLogs,
      criticalCount,
      warningCount,
      fraudAttempts,
      recentCritical,
    };
  }

  /**
   * Alertas anti-fraude detalhados para o painel ADMIN
   */
  async getFraudAlerts() {
    const alerts = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: 'FRAUD_ATTEMPT' },
          { severity: 'CRITICAL' },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const totalFraudAttempts = alerts.filter(a => a.action === 'FRAUD_ATTEMPT').length;

    return {
      total: alerts.length,
      totalFraudAttempts,
      alerts,
    };
  }
}

module.exports = new AuditLogService();

