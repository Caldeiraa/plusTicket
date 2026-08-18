const { prisma } = require('../../config/database');
const { emitCheckIn, emitStats } = require('../../config/socket');
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
}

module.exports = new CheckInService();
