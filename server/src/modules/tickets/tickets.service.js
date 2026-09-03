const { prisma } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const { generateQRCodeDataUrl } = require('../../services/qrCodeGenerator');
const { generateTicketPDF } = require('../../services/pdfGenerator');
const auditLog = require('../auditlog/auditlog.service');
const logger = require('../../utils/logger');

class TicketsService {
  /**
   * Limpar / expirar transferências que passaram de 30 minutos
   */
  async checkAndExpireTransfers() {
    try {
      await prisma.ticketTransfer.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
      });
    } catch (err) {
      logger.error('Erro ao expirar transferências:', err);
    }
  }

  /**
   * Criar tipo de ingresso para um evento
   */
  async createTicketType(eventId, data, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    if (event.organizerId !== userId) {
      throw Object.assign(new Error('Apenas o organizador pode criar tipos de ingresso'), { statusCode: 403 });
    }

    const ticketType = await prisma.ticketType.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        quantity: data.quantity,
        maxPerUser: data.maxPerUser || 5,
        salesStart: data.salesStart ? new Date(data.salesStart) : null,
        salesEnd: data.salesEnd ? new Date(data.salesEnd) : null,
        eventId,
      },
    });

    logger.info(`Tipo de ingresso criado: ${ticketType.name} para evento ${eventId}`);
    return ticketType;
  }

  /**
   * Listar tipos de ingresso de um evento
   */
  async getTicketTypes(eventId) {
    return prisma.ticketType.findMany({
      where: { eventId, isActive: true },
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        quantity: true,
        sold: true,
        maxPerUser: true,
        salesStart: true,
        salesEnd: true,
        _count: { select: { tickets: true } },
      },
    });
  }

  /**
   * Comprar ingressos (criar order + tickets)
   * Modo de teste: gera o pedido e os ingressos com status PAID e QR Codes diretamente
   */
  async purchaseTickets(data, userId) {
    const { eventId, items, holderName, holderEmail, holderDoc } = data;

    // 1. Buscar usuário
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
    }

    // 2. Buscar evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw Object.assign(new Error('Evento não encontrado'), { statusCode: 404 });
    }

    // 3. Validar lotes de ingressos e calcular totais
    let totalAmount = 0;
    const ticketTypesData = [];

    for (const item of items) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: item.ticketTypeId },
      });

      if (!ticketType || ticketType.eventId !== eventId || !ticketType.isActive) {
        throw Object.assign(
          new Error(`Tipo de ingresso não encontrado ou inválido para este evento: ${item.ticketTypeId}`),
          { statusCode: 404 }
        );
      }

      const available = ticketType.quantity - ticketType.sold;
      if (available < item.quantity) {
        throw Object.assign(
          new Error(`Quantidade insuficiente para o lote "${ticketType.name}". Disponíveis: ${Math.max(0, available)}`),
          { statusCode: 400 }
        );
      }

      const unitPrice = Number(ticketType.price);
      const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
      totalAmount += itemTotal;

      ticketTypesData.push({
        ticketType,
        item,
        itemTotal,
      });
    }

    totalAmount = Number(totalAmount.toFixed(2));
    const serviceFee = Number((totalAmount * 0.10).toFixed(2));
    const finalAmount = Number((totalAmount + serviceFee).toFixed(2));

    const orderNumber = `PT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // =========================================================================
    // ETAPA 1: CRIAÇÃO DO PEDIDO
    // =========================================================================
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'CONFIRMED',
        totalAmount,
        serviceFee,
        discountAmount: 0,
        finalAmount,
        userId,
        eventId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expira em 30 min
        items: {
          create: ticketTypesData.map(({ ticketType, item, itemTotal }) => ({
            quantity: item.quantity,
            unitPrice: ticketType.price,
            totalPrice: itemTotal,
            ticketTypeId: item.ticketTypeId,
          })),
        },
      },
    });

    // =========================================================================
    // ETAPA 2: GERAÇÃO DOS INGRESSOS COM QR CODE
    // =========================================================================
    const tickets = [];

    await prisma.$transaction(async (tx) => {
      for (const { ticketType, item } of ticketTypesData) {
        for (let i = 0; i < item.quantity; i++) {
          const code = `TK-${uuidv4().substring(0, 8).toUpperCase()}`;
          let qrCode = code;
          try {
            qrCode = await generateQRCodeDataUrl(code);
          } catch (e) {
            logger.error('Erro ao gerar QR Code', e);
          }

          const ticket = await tx.ticket.create({
            data: {
              code,
              qrCode,
              status: 'PAID',
              holderName: item.holderName || holderName || user?.name || 'Participante',
              holderEmail: item.holderEmail || holderEmail || user?.email || 'participante@email.com',
              holderDoc: item.holderDoc || holderDoc || null,
              eventId,
              ticketTypeId: item.ticketTypeId,
              userId,
              orderId: order.id,
            },
          });

          tickets.push(ticket);
        }

        // Atualiza a quantidade vendida no lote
        await tx.ticketType.update({
          where: { id: ticketType.id },
          data: { sold: { increment: item.quantity } },
        });
      }
    });

    logger.info(`Pedido finalizado [TESTE]: ${order.orderNumber} - Total R$ ${finalAmount}`);

    // Registrar compra no AuditLog
    auditLog.logPurchase(order, userId, user?.name || 'Participante');

    return { order, tickets };
  }

  /**
   * Obter ingresso por ID
   */
  async getTicketById(ticketId, userId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: { id: true, title: true, venue: true, address: true, date: true, imageUrl: true },
        },
        ticketType: {
          select: { id: true, name: true, price: true },
        },
        checkIn: true,
      },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ingresso não encontrado'), { statusCode: 404 });
    }

    if (ticket.userId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    return ticket;
  }

  /**
   * Gerar PDF do ingresso
   */
  async getTicketPDF(ticketId, userId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
        ticketType: true,
      },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ingresso não encontrado'), { statusCode: 404 });
    }

    if (ticket.userId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    if (ticket.status !== 'PAID') {
      throw Object.assign(new Error('Ingresso não está confirmado'), { statusCode: 400 });
    }

    const pdfBuffer = await generateTicketPDF(ticket);
    return { pdfBuffer, filename: `ingresso-${ticket.code}.pdf` };
  }

  /**
   * Meus ingressos
   */
  async getMyTickets(userId, query = {}) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
    }

    await this.checkAndExpireTransfers();

    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: { id: true, title: true, venue: true, date: true, imageUrl: true, slug: true, city: true },
          },
          ticketType: {
            select: { id: true, name: true, price: true },
          },
          checkIn: {
            select: { checkedAt: true },
          },
          transfers: {
            where: { status: 'PENDING' },
            include: {
              receiver: { select: { id: true, name: true, email: true } },
            },
          },
          refund: {
            select: { id: true, status: true, refundPercent: true, refundAmount: true },
          },
        },
      }),
      prisma.ticket.count({ where: { userId } }),
    ]);

    return { tickets, total, page, limit };
  }

  /**
   * Iniciar transferência de ingresso por e-mail
   * REGRAS:
   * 1. Apenas e-mails já cadastrados no site.
   * 2. Prazo de confirmação: 30 minutos.
   * 3. Limite: no máximo 2 transferências por ingresso.
   * 4. Prazo: até 2 horas antes do evento.
   */
  async initiateTransfer(ticketId, targetEmail, senderId) {
    await this.checkAndExpireTransfers();

    const cleanEmail = targetEmail ? targetEmail.trim().toLowerCase() : '';
    if (!cleanEmail) {
      throw Object.assign(new Error('Informe um e-mail válido para transferência'), { statusCode: 400 });
    }

    // 1. Buscar ingresso
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
        checkIn: true,
        transfers: { where: { status: 'PENDING' } },
      },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ingresso não encontrado'), { statusCode: 404 });
    }

    if (ticket.userId !== senderId) {
      throw Object.assign(new Error('Apenas o dono do ingresso pode realizar a transferência'), { statusCode: 403 });
    }

    if (ticket.status !== 'PAID') {
      throw Object.assign(new Error('Somente ingressos pagos/confirmados podem ser transferidos'), { statusCode: 400 });
    }

    if (ticket.checkIn) {
      throw Object.assign(new Error('Este ingresso já passou pelo check-in na portaria e não pode ser transferido'), { statusCode: 400 });
    }

    // Verificar limite de 2 transferências
    if (ticket.transferCount >= 2) {
      throw Object.assign(
        new Error('Limite excedido: este ingresso já atingiu o máximo de 2 transferências permitidas'),
        { statusCode: 400 }
      );
    }

    // Verificar prazo de 2 horas antes do evento
    const hoursUntilEvent = (new Date(ticket.event.date).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilEvent < 2) {
      throw Object.assign(
        new Error('A transferência de ingressos só é permitida até 2 horas antes do início do evento'),
        { statusCode: 400 }
      );
    }

    // Verificar se já tem transferência pendente
    if (ticket.transfers && ticket.transfers.length > 0) {
      throw Object.assign(
        new Error('Já existe uma transferência pendente para este ingresso. Aguarde ou cancele a transferência atual.'),
        { statusCode: 400 }
      );
    }

    // 2. Verificar se e-mail de destino está cadastrado no site
    const receiver = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!receiver) {
      throw Object.assign(
        new Error('O e-mail de destino não está cadastrado na plataforma. A transferência só é permitida para usuários já cadastrados.'),
        { statusCode: 404 }
      );
    }

    if (receiver.id === senderId) {
      throw Object.assign(new Error('Você não pode transferir um ingresso para você mesmo'), { statusCode: 400 });
    }

    if (receiver.role === 'ORGANIZER') {
      throw Object.assign(new Error('O e-mail informado pertence a uma conta de organizador.'), { statusCode: 400 });
    }

    // 3. Criar a transferência com validade de 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    const transfer = await prisma.ticketTransfer.create({
      data: {
        ticketId,
        senderId,
        receiverId: receiver.id,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        receiver: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, code: true } },
      },
    });

    logger.info(`Transferência iniciada: Ticket ${ticket.code} para ${receiver.email} (Expira em 30 min)`);

    // Registrar transferência no AuditLog
    auditLog.logTransfer(transfer, senderId, null, receiver.email);

    return transfer;
  }

  /**
   * Aceitar/Confirmar transferência recebida
   */
  async acceptTransfer(transferId, receiverId) {
    await this.checkAndExpireTransfers();

    const transfer = await prisma.ticketTransfer.findUnique({
      where: { id: transferId },
      include: {
        receiver: true,
        sender: true,
        ticket: true,
      },
    });

    if (!transfer) {
      throw Object.assign(new Error('Transferência não encontrada'), { statusCode: 404 });
    }

    if (transfer.receiverId !== receiverId) {
      throw Object.assign(new Error('Apenas o destinatário correto pode aceitar esta transferência'), { statusCode: 403 });
    }

    if (transfer.status !== 'PENDING') {
      throw Object.assign(new Error(`Transferência não está mais pendente (Status: ${transfer.status})`), { statusCode: 400 });
    }

    if (new Date() > transfer.expiresAt) {
      await prisma.ticketTransfer.update({
        where: { id: transferId },
        data: { status: 'EXPIRED' },
      });
      throw Object.assign(
        new Error('O prazo de 30 minutos para confirmação expirou. O ingresso foi estornado para o remetente original.'),
        { statusCode: 400 }
      );
    }

    // Regenerar QR Code e trocar titular em transação
    const newCode = `TK-${uuidv4().substring(0, 8).toUpperCase()}`;
    const newQrCode = await generateQRCodeDataUrl(newCode);

    await prisma.$transaction([
      prisma.ticketTransfer.update({
        where: { id: transferId },
        data: { status: 'ACCEPTED' },
      }),
      prisma.ticket.update({
        where: { id: transfer.ticketId },
        data: {
          userId: receiverId,
          holderName: transfer.receiver.name,
          holderEmail: transfer.receiver.email,
          code: newCode,
          qrCode: newQrCode,
          transferCount: { increment: 1 },
        },
      }),
    ]);

    logger.info(`Transferência aceita! Ticket ${newCode} atribuído a ${transfer.receiver.email}`);
    return { success: true, message: 'Ingresso transferido e novo QR Code gerado com sucesso!' };
  }

  /**
   * Cancelar transferência enviada
   */
  async cancelTransfer(transferId, senderId) {
    const transfer = await prisma.ticketTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw Object.assign(new Error('Transferência não encontrada'), { statusCode: 404 });
    }

    if (transfer.senderId !== senderId) {
      throw Object.assign(new Error('Apenas o remetente pode cancelar a transferência'), { statusCode: 403 });
    }

    if (transfer.status !== 'PENDING') {
      throw Object.assign(new Error('Esta transferência não está pendente'), { statusCode: 400 });
    }

    await prisma.ticketTransfer.update({
      where: { id: transferId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, message: 'Transferência cancelada' };
  }

  /**
   * Listar transferências pendentes (recebidas e enviadas)
   */
  async getPendingTransfers(userId) {
    await this.checkAndExpireTransfers();

    const [received, sent] = await Promise.all([
      prisma.ticketTransfer.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          ticket: {
            include: {
              event: { select: { title: true, date: true, venue: true, imageUrl: true } },
              ticketType: { select: { name: true, price: true } },
            },
          },
        },
      }),
      prisma.ticketTransfer.findMany({
        where: { senderId: userId, status: 'PENDING' },
        include: {
          receiver: { select: { id: true, name: true, email: true } },
          ticket: {
            include: {
              event: { select: { title: true, date: true } },
              ticketType: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return { received, sent };
  }
}

module.exports = new TicketsService();
