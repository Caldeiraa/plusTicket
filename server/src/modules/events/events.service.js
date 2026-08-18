const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');

class EventsService {
  /**
   * Criar evento
   */
  async create(data, organizerId) {
    // Gerar slug a partir do título
    const baseSlug = data.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Verificar slug único
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        shortDesc: data.shortDesc,
        venue: data.venue,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        doorsOpen: data.doorsOpen ? new Date(data.doorsOpen) : null,
        imageUrl: data.imageUrl,
        capacity: data.capacity,
        isOnline: data.isOnline || false,
        onlineUrl: data.onlineUrl,
        organizerId,
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info(`Evento criado: ${event.title} (${event.id})`);
    return event;
  }

  /**
   * Listar eventos (público)
   */
  async list(query) {
    const { page, limit, status, city, search, startDate, endDate, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where = {};

    // Filtros
    if (status) {
      where.status = status;
    } else {
      where.status = 'PUBLISHED'; // Default: só publicados
    }

    if (city) {
      where.city = { contains: city };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { venue: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          organizer: {
            select: { id: true, name: true },
          },
          ticketTypes: {
            where: { isActive: true },
            select: { id: true, name: true, price: true, quantity: true, sold: true },
          },
          _count: {
            select: { tickets: true, checkIns: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  /**
   * Obter evento por ID ou slug
   */
  async getById(idOrSlug) {
    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        ticketTypes: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
        _count: {
          select: { tickets: true, checkIns: true, orders: true },
        },
      },
    });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    return event;
  }

  /**
   * Atualizar evento
   */
  async update(eventId, data, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Apenas o organizador pode editar este evento'), { statusCode: 403 });
    }

    const updateData = { ...data };
    if (data.date) updateData.date = new Date(data.date);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.doorsOpen) updateData.doorsOpen = new Date(data.doorsOpen);

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        ticketTypes: true,
      },
    });

    logger.info(`Evento atualizado: ${updated.title} (${updated.id})`);
    return updated;
  }

  /**
   * Publicar evento
   */
  async publish(eventId, userId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true },
    });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Apenas o organizador pode publicar'), { statusCode: 403 });
    }

    if (event.status !== 'DRAFT') {
      throw Object.assign(new Error(`Evento com status ${event.status} não pode ser publicado`), { statusCode: 400 });
    }

    if (event.ticketTypes.length === 0) {
      throw Object.assign(new Error('Crie ao menos um tipo de ingresso antes de publicar'), { statusCode: 400 });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'PUBLISHED' },
    });

    logger.info(`Evento publicado: ${updated.title}`);
    return updated;
  }

  /**
   * Cancelar evento (soft delete)
   */
  async cancel(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Apenas o organizador pode cancelar'), { statusCode: 403 });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'CANCELLED' },
    });

    logger.info(`Evento cancelado: ${updated.title}`);
    return updated;
  }

  /**
   * Eventos do organizador
   */
  async getMyEvents(userId, query) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { organizerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ticketTypes: {
            select: { id: true, name: true, price: true, quantity: true, sold: true },
          },
          _count: {
            select: { tickets: true, checkIns: true, orders: true },
          },
        },
      }),
      prisma.event.count({ where: { organizerId: userId } }),
    ]);

    return { events, total, page, limit };
  }

  /**
   * Estatísticas do evento
   */
  async getStats(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    const [ticketTypes, totalTickets, totalCheckIns, totalOrders, revenue] = await Promise.all([
      prisma.ticketType.findMany({
        where: { eventId },
        select: { name: true, price: true, quantity: true, sold: true },
      }),
      prisma.ticket.count({ where: { eventId, status: 'PAID' } }),
      prisma.checkIn.count({ where: { eventId } }),
      prisma.order.count({ where: { eventId, status: 'CONFIRMED' } }),
      prisma.order.aggregate({
        where: { eventId, status: 'CONFIRMED' },
        _sum: { finalAmount: true },
      }),
    ]);

    return {
      event: { id: event.id, title: event.title, capacity: event.capacity, status: event.status },
      ticketTypes,
      totalTicketsSold: totalTickets,
      totalCheckIns,
      totalOrders,
      totalRevenue: revenue._sum.finalAmount || 0,
      occupancyRate: event.capacity > 0 ? ((totalCheckIns / event.capacity) * 100).toFixed(1) : 0,
    };
  }
}

module.exports = new EventsService();
