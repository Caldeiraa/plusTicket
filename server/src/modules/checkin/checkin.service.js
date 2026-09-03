const { prisma } = require('../../config/database');
const { emitCheckIn, emitStats } = require('../../config/socket');
const auditLog = require('../auditlog/auditlog.service');
const logger = require('../../utils/logger');

class CheckInService {
  /**
   * Realizar check-in via código do ingresso (QR Code)
   */
  async checkIn(data, checkedBy) {
    const { ticketCode, gate, notes, latitude, longitude } = data;

    // Buscar ticket pelo código
    const ticket = await prisma.ticket.findUnique({
      where: { code: ticketCode },
      include: {
        event: {
          select: { id: true, title: true, status: true, date: true, capacity: true },
        },
        ticketType: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        checkIn: true,
      },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ingresso não encontrado'), { statusCode: 404 });
    }

    // Validações
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
      throw Object.assign(
        new Error(`Ingresso ${ticket.status === 'CANCELLED' ? 'cancelado' : 'reembolsado'}`),
        { statusCode: 400 }
      );
    }

    if (ticket.status === 'PENDING') {
      throw Object.assign(new Error('Pagamento do ingresso ainda não foi confirmado'), { statusCode: 400 });
    }

    if (ticket.status === 'USED' || ticket.checkIn) {
      // Registrar tentativa de fraude no AuditLog
      auditLog.logFraudAttempt(ticketCode, `Ingresso já utilizado em ${ticket.checkIn?.checkedAt?.toLocaleString('pt-BR')}`, checkedBy);

      throw Object.assign(
        new Error(`Ingresso já utilizado em ${ticket.checkIn?.checkedAt?.toLocaleString('pt-BR')}`),
        { statusCode: 409 }
      );
    }

    if (ticket.event.status === 'CANCELLED') {
      throw Object.assign(new Error('Evento cancelado'), { statusCode: 400 });
    }

    // Realizar check-in em transação
    const checkIn = await prisma.$transaction(async (tx) => {
      // Marcar ticket como usado
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED' },
      });

      // Criar registro de check-in
      const checkInRecord = await tx.checkIn.create({
        data: {
          checkedBy,
          gate,
          notes,
          latitude,
          longitude,
          ticketId: ticket.id,
          eventId: ticket.event.id,
          userId: ticket.user.id,
        },
      });

      return checkInRecord;
    });

    // Buscar estatísticas atualizadas
    const [totalCheckIns, totalTickets] = await Promise.all([
      prisma.checkIn.count({ where: { eventId: ticket.event.id } }),
      prisma.ticket.count({ where: { eventId: ticket.event.id, status: { in: ['PAID', 'USED'] } } }),
    ]);

    const checkInData = {
      checkInId: checkIn.id,
      ticketCode: ticket.code,
      holderName: ticket.user.name,
      ticketType: ticket.ticketType.name,
      gate: gate || 'Principal',
      checkedAt: checkIn.checkedAt,
      eventId: ticket.event.id,
    };

    const statsData = {
      eventId: ticket.event.id,
      totalCheckIns,
      totalTickets,
      capacity: ticket.event.capacity,
      occupancyRate: ticket.event.capacity > 0
        ? ((totalCheckIns / ticket.event.capacity) * 100).toFixed(1)
        : 0,
    };

    // Emitir via WebSocket em tempo real
    emitCheckIn(ticket.event.id, checkInData);
    emitStats(ticket.event.id, statsData);

    logger.info(`Check-in realizado: ${ticket.code} - ${ticket.user.name} no evento ${ticket.event.title}`);

    // Registrar no AuditLog
    auditLog.logCheckIn({ id: ticket.id, code: ticket.code, holderName: ticket.user.name, eventId: ticket.event.id, gate }, checkedBy, ticket.user.name);

    return {
      ...checkInData,
      event: { title: ticket.event.title },
      stats: statsData,
    };
  }

  /**
   * Listar check-ins de um evento
   */
  async getEventCheckIns(eventId, userId, query = {}) {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // Verificar permissão
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    const [checkIns, total] = await Promise.all([
      prisma.checkIn.findMany({
        where: { eventId },
        skip,
        take: limit,
        orderBy: { checkedAt: 'desc' },
        include: {
          ticket: {
            select: { code: true, holderName: true, holderEmail: true },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.checkIn.count({ where: { eventId } }),
    ]);

    return { checkIns, total, page, limit };
  }

  /**
   * Gerar pacote offline de ingressos válidos para cache local
   * Retorna lista de códigos + status para sincronização com IndexedDB
   */
  async getOfflinePack(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    // Buscar todos os ingressos válidos (PAID) do evento
    const validTickets = await prisma.ticket.findMany({
      where: {
        eventId,
        status: 'PAID',
      },
      select: {
        id: true,
        code: true,
        holderName: true,
        holderEmail: true,
        ticketType: { select: { name: true } },
      },
    });

    // Buscar ingressos já utilizados (USED) para o cache também saber
    const usedTickets = await prisma.ticket.findMany({
      where: {
        eventId,
        status: 'USED',
      },
      select: {
        id: true,
        code: true,
      },
    });

    logger.info(`Pacote offline gerado para evento ${eventId}: ${validTickets.length} válidos, ${usedTickets.length} já usados`);

    // Registrar no AuditLog
    auditLog.log({
      action: 'OFFLINE_SYNC',
      entityType: 'EVENT',
      entityId: eventId,
      userId,
      details: `Pacote offline baixado: ${validTickets.length} ingressos válidos`,
      severity: 'INFO',
    });

    return {
      eventId,
      eventTitle: event.title,
      generatedAt: new Date().toISOString(),
      validTickets: validTickets.map(t => ({
        id: t.id,
        code: t.code,
        holderName: t.holderName,
        ticketType: t.ticketType.name,
      })),
      usedCodes: usedTickets.map(t => t.code),
      totalValid: validTickets.length,
      totalUsed: usedTickets.length,
    };
  }

  /**
   * Sincronizar check-ins realizados offline
   * Recebe um array de check-ins feitos localmente e reconcilia com o servidor
   */
  async syncOfflineCheckIns(eventId, checkIns, userId, userName) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    const results = [];

    for (const offlineCheckIn of checkIns) {
      try {
        // Tentar realizar o check-in normalmente
        const result = await this.checkIn({
          ticketCode: offlineCheckIn.ticketCode,
          gate: offlineCheckIn.gate || 'Offline',
          notes: `Check-in offline sincronizado (realizado em ${offlineCheckIn.checkedAt || 'horário desconhecido'})`,
        }, userName || 'Sistema (Offline)');

        results.push({
          ticketCode: offlineCheckIn.ticketCode,
          status: 'SYNCED',
          message: 'Check-in sincronizado com sucesso',
        });
      } catch (err) {
        // Se o ingresso já foi usado, registrar como já sincronizado
        if (err.statusCode === 409) {
          results.push({
            ticketCode: offlineCheckIn.ticketCode,
            status: 'ALREADY_USED',
            message: 'Ingresso já foi validado anteriormente',
          });
        } else {
          results.push({
            ticketCode: offlineCheckIn.ticketCode,
            status: 'ERROR',
            message: err.message,
          });
        }
      }
    }

    const synced = results.filter(r => r.status === 'SYNCED').length;
    const alreadyUsed = results.filter(r => r.status === 'ALREADY_USED').length;
    const errors = results.filter(r => r.status === 'ERROR').length;

    logger.info(`Sync offline: ${synced} sincronizados, ${alreadyUsed} já usados, ${errors} erros`);

    // Registrar no AuditLog
    auditLog.log({
      action: 'OFFLINE_SYNC',
      entityType: 'EVENT',
      entityId: eventId,
      userId,
      userName,
      details: `Sincronização offline: ${synced} novos, ${alreadyUsed} duplicados, ${errors} erros`,
      metadata: { synced, alreadyUsed, errors, total: checkIns.length },
      severity: synced > 0 ? 'INFO' : 'WARNING',
    });

    return {
      total: checkIns.length,
      synced,
      alreadyUsed,
      errors,
      results,
    };
  }
}

module.exports = new CheckInService();
