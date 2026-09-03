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

  /**
   * Analytics expandido — vendas por período, taxa de conversão, disponíveis por lote
   */
  async getAnalytics(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    // Vendas por dia (últimos 30 dias)
    const salesByDay = await prisma.$queryRaw`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d') as date,
        COUNT(*) as orders,
        COALESCE(SUM(final_amount), 0) as revenue
      FROM orders
      WHERE event_id = ${eventId} AND status = 'CONFIRMED'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `;

    // Taxa de conversão (pedidos confirmados / total de pedidos)
    const [totalOrders, confirmedOrders] = await Promise.all([
      prisma.order.count({ where: { eventId } }),
      prisma.order.count({ where: { eventId, status: 'CONFIRMED' } }),
    ]);

    const conversionRate = totalOrders > 0
      ? ((confirmedOrders / totalOrders) * 100).toFixed(1)
      : 0;

    // Disponibilidade por lote
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
        sold: true,
        isActive: true,
      },
    });

    const availability = ticketTypes.map(tt => ({
      ...tt,
      available: tt.quantity - tt.sold,
      soldPercent: tt.quantity > 0 ? ((tt.sold / tt.quantity) * 100).toFixed(1) : 0,
      price: Number(tt.price),
    }));

    // Vendas por hora do dia (para identificar horários de pico)
    const salesByHour = await prisma.$queryRaw`
      SELECT
        HOUR(created_at) as hour,
        COUNT(*) as count
      FROM orders
      WHERE event_id = ${eventId} AND status = 'CONFIRMED'
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `;

    return {
      salesByDay: salesByDay.map(d => ({ ...d, revenue: Number(d.revenue) })),
      conversionRate: parseFloat(conversionRate),
      totalOrders,
      confirmedOrders,
      availability,
      salesByHour: salesByHour.map(h => ({ hour: `${String(h.hour).padStart(2, '0')}:00`, count: Number(h.count) })),
    };
  }

  /**
   * Análise de check-ins por portão/gate
   */
  async getGateAnalysis(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    // Check-ins agrupados por portão
    const byGate = await prisma.$queryRaw`
      SELECT
        COALESCE(gate, 'Principal') as gate,
        COUNT(*) as total,
        MIN(checked_at) as firstCheckIn,
        MAX(checked_at) as lastCheckIn
      FROM check_ins
      WHERE event_id = ${eventId}
      GROUP BY COALESCE(gate, 'Principal')
      ORDER BY total DESC
    `;

    // Check-ins por hora por portão (para gráfico detalhado)
    const byGateByHour = await prisma.$queryRaw`
      SELECT
        COALESCE(gate, 'Principal') as gate,
        DATE_FORMAT(checked_at, '%H:00') as hour,
        COUNT(*) as count
      FROM check_ins
      WHERE event_id = ${eventId}
      GROUP BY COALESCE(gate, 'Principal'), DATE_FORMAT(checked_at, '%H:00')
      ORDER BY gate, hour ASC
    `;

    const totalCheckIns = await prisma.checkIn.count({ where: { eventId } });

    return {
      totalCheckIns,
      byGate: byGate.map(g => ({
        gate: g.gate,
        total: Number(g.total),
        percent: totalCheckIns > 0 ? ((Number(g.total) / totalCheckIns) * 100).toFixed(1) : 0,
        firstCheckIn: g.firstCheckIn,
        lastCheckIn: g.lastCheckIn,
      })),
      byGateByHour: byGateByHour.map(g => ({
        gate: g.gate,
        hour: g.hour,
        count: Number(g.count),
      })),
    };
  }

  /**
   * Inteligência de vendas — insights automáticos baseados nos dados
   */
  async getInsights(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    const insights = [];

    // 1. Comparação de vendas últimas 24h vs 24h anteriores
    const [salesLast24h, salesPrev24h] = await Promise.all([
      prisma.order.count({
        where: {
          eventId,
          status: 'CONFIRMED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.order.count({
        where: {
          eventId,
          status: 'CONFIRMED',
          createdAt: {
            gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    if (salesPrev24h > 0 && salesLast24h > salesPrev24h) {
      const increase = (((salesLast24h - salesPrev24h) / salesPrev24h) * 100).toFixed(0);
      insights.push({
        type: 'POSITIVE',
        icon: '📈',
        title: 'Vendas em alta',
        message: `As vendas aumentaram ${increase}% nas últimas 24 horas em relação ao dia anterior.`,
      });
    } else if (salesPrev24h > 0 && salesLast24h < salesPrev24h) {
      const decrease = (((salesPrev24h - salesLast24h) / salesPrev24h) * 100).toFixed(0);
      insights.push({
        type: 'WARNING',
        icon: '📉',
        title: 'Queda nas vendas',
        message: `As vendas caíram ${decrease}% nas últimas 24 horas. Considere divulgar mais o evento.`,
      });
    }

    // 2. Lotes próximos de esgotar
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId, isActive: true },
      select: { name: true, quantity: true, sold: true, price: true },
    });

    for (const tt of ticketTypes) {
      const percent = tt.quantity > 0 ? (tt.sold / tt.quantity) * 100 : 0;
      if (percent >= 90 && percent < 100) {
        insights.push({
          type: 'URGENT',
          icon: '🔥',
          title: `Lote "${tt.name}" quase esgotado`,
          message: `${tt.sold} de ${tt.quantity} vendidos (${percent.toFixed(0)}%). Restam apenas ${tt.quantity - tt.sold} ingressos.`,
        });
      } else if (percent >= 100) {
        insights.push({
          type: 'INFO',
          icon: '✅',
          title: `Lote "${tt.name}" esgotado`,
          message: `Todos os ${tt.quantity} ingressos foram vendidos! Considere abrir um novo lote.`,
        });
      } else if (percent >= 70) {
        insights.push({
          type: 'POSITIVE',
          icon: '🚀',
          title: `Lote "${tt.name}" vendendo bem`,
          message: `${percent.toFixed(0)}% vendido. Considere preparar o próximo lote.`,
        });
      } else if (percent < 20 && tt.quantity > 0) {
        insights.push({
          type: 'WARNING',
          icon: '⚠️',
          title: `Lote "${tt.name}" com poucas vendas`,
          message: `Apenas ${percent.toFixed(0)}% vendido. O evento pode ter baixa conversão neste lote.`,
        });
      }
    }

    // 3. Horário de pico de vendas
    const peakHour = await prisma.$queryRaw`
      SELECT
        HOUR(created_at) as hour,
        COUNT(*) as count
      FROM orders
      WHERE event_id = ${eventId} AND status = 'CONFIRMED'
      GROUP BY HOUR(created_at)
      ORDER BY count DESC
      LIMIT 1
    `;

    if (peakHour.length > 0) {
      insights.push({
        type: 'INFO',
        icon: '🕐',
        title: 'Melhor horário de vendas',
        message: `O horário com maior volume de vendas é entre ${String(peakHour[0].hour).padStart(2, '0')}h e ${String(peakHour[0].hour + 1).padStart(2, '0')}h (${Number(peakHour[0].count)} pedidos).`,
      });
    }

    // 4. Taxa de conversão
    const [totalOrders, confirmedOrders] = await Promise.all([
      prisma.order.count({ where: { eventId } }),
      prisma.order.count({ where: { eventId, status: 'CONFIRMED' } }),
    ]);

    if (totalOrders > 0) {
      const rate = ((confirmedOrders / totalOrders) * 100).toFixed(1);
      if (rate < 50) {
        insights.push({
          type: 'WARNING',
          icon: '📊',
          title: 'Baixa taxa de conversão',
          message: `Apenas ${rate}% dos pedidos foram confirmados. Verifique se o processo de checkout está funcionando.`,
        });
      } else {
        insights.push({
          type: 'POSITIVE',
          icon: '📊',
          title: 'Boa taxa de conversão',
          message: `${rate}% dos pedidos foram confirmados com sucesso.`,
        });
      }
    }

    // 5. Dias até o evento
    const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const totalSold = ticketTypes.reduce((acc, tt) => acc + tt.sold, 0);
    const totalCapacity = event.capacity;

    if (daysUntil > 0 && daysUntil <= 7) {
      const soldPercent = totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(0) : 0;
      insights.push({
        type: daysUntil <= 3 ? 'URGENT' : 'INFO',
        icon: '📅',
        title: `${daysUntil} dia${daysUntil > 1 ? 's' : ''} para o evento`,
        message: `${soldPercent}% da capacidade vendida (${totalSold}/${totalCapacity}).`,
      });
    }

    // 6. Check-ins (se já tiver)
    const totalCheckIns = await prisma.checkIn.count({ where: { eventId } });
    if (totalCheckIns > 0) {
      const checkInRate = totalSold > 0 ? ((totalCheckIns / totalSold) * 100).toFixed(1) : 0;
      insights.push({
        type: 'INFO',
        icon: '🎫',
        title: 'Taxa de presença',
        message: `${totalCheckIns} check-ins realizados (${checkInRate}% dos ingressos vendidos).`,
      });
    }

    return { insights, generatedAt: new Date().toISOString() };
  }
}

module.exports = new DashboardService();
