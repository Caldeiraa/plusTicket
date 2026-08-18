const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');

class DashboardService {
  /**
   * Dados ao vivo do evento
   */
  async getLiveData(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    // Últimos check-ins (últimos 20)
    const recentCheckIns = await prisma.checkIn.findMany({
      where: { eventId },
      take: 20,
      orderBy: { checkedAt: 'desc' },
      include: {
        ticket: {
          select: { code: true, holderName: true },
        },
        user: {
          select: { name: true },
        },
      },
    });

    // Estatísticas gerais
    const [totalCheckIns, totalTicketsSold, totalRevenue] = await Promise.all([
      prisma.checkIn.count({ where: { eventId } }),
      prisma.ticket.count({ where: { eventId, status: { in: ['PAID', 'USED'] } } }),
      prisma.order.aggregate({
        where: { eventId, status: 'CONFIRMED' },
        _sum: { finalAmount: true },
      }),
    ]);

    // Check-ins por hora (para gráfico)
    const checkInsByHour = await prisma.$queryRaw`
      SELECT
        DATE_FORMAT(checked_at, '%H:00') as hour,
        COUNT(*) as count
      FROM check_ins
      WHERE event_id = ${eventId}
      GROUP BY DATE_FORMAT(checked_at, '%H:00')
      ORDER BY hour ASC
    `;

    // Vendas por tipo de ingresso
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      select: {
        name: true,
        price: true,
        quantity: true,
        sold: true,
      },
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity,
        status: event.status,
        date: event.date,
      },
      stats: {
        totalCheckIns,
        totalTicketsSold,
        totalRevenue: Number(totalRevenue._sum.finalAmount || 0),
        capacity: event.capacity,
        occupancyRate: event.capacity > 0
          ? ((totalCheckIns / event.capacity) * 100).toFixed(1)
          : 0,
        salesRate: event.capacity > 0
          ? ((totalTicketsSold / event.capacity) * 100).toFixed(1)
          : 0,
      },
      recentCheckIns,
      checkInsByHour,
      ticketTypes,
    };
  }

  /**
   * Resumo de vendas e check-ins
   */
  async getSummary(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    const [
      totalOrders,
      confirmedOrders,
      cancelledOrders,
      totalTickets,
      paidTickets,
      usedTickets,
      pendingTickets,
      totalCheckIns,
      revenue,
      ticketTypes,
    ] = await Promise.all([
      prisma.order.count({ where: { eventId } }),
      prisma.order.count({ where: { eventId, status: 'CONFIRMED' } }),
      prisma.order.count({ where: { eventId, status: 'CANCELLED' } }),
      prisma.ticket.count({ where: { eventId } }),
      prisma.ticket.count({ where: { eventId, status: 'PAID' } }),
      prisma.ticket.count({ where: { eventId, status: 'USED' } }),
      prisma.ticket.count({ where: { eventId, status: 'PENDING' } }),
      prisma.checkIn.count({ where: { eventId } }),
      prisma.order.aggregate({
        where: { eventId, status: 'CONFIRMED' },
        _sum: { finalAmount: true },
      }),
      prisma.ticketType.findMany({
        where: { eventId },
        select: { name: true, price: true, quantity: true, sold: true },
      }),
    ]);

    return {
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity,
        date: event.date,
      },
      orders: {
        total: totalOrders,
        confirmed: confirmedOrders,
        cancelled: cancelledOrders,
      },
      tickets: {
        total: totalTickets,
        paid: paidTickets,
        used: usedTickets,
        pending: pendingTickets,
      },
      checkIns: {
        total: totalCheckIns,
        occupancyRate: event.capacity > 0
          ? ((totalCheckIns / event.capacity) * 100).toFixed(1)
          : 0,
      },
      revenue: {
        total: Number(revenue._sum.finalAmount || 0),
        currency: 'BRL',
      },
      ticketTypes,
    };
  }
}

module.exports = new DashboardService();
