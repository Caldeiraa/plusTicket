const { prisma } = require('../../config/database');
const { stripe } = require('../../config/stripe');
const { addEmailJob, addPdfJob } = require('../../jobs/queues');
const { emitTicketSold } = require('../../config/socket');
const logger = require('../../utils/logger');

class PaymentsService {
  /**
   * Criar Payment Intent no Stripe
   */
  async createPaymentIntent(orderId, paymentMethod, userId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { ticketType: true } },
        event: { select: { id: true, title: true } },
        tickets: true,
      },
    });

    if (!order) {
      throw Object.assign(new Error('Pedido não encontrado'), { statusCode: 404 });
    }

    if (order.userId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    if (order.status !== 'PENDING') {
      throw Object.assign(new Error(`Pedido com status ${order.status} não pode ser pago`), { statusCode: 400 });
    }

    // Verificar se não expirou
    if (order.expiresAt && new Date() > order.expiresAt) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
      throw Object.assign(new Error('Pedido expirado'), { statusCode: 400 });
    }

    // Criar PaymentIntent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.finalAmount) * 100), // Em centavos
      currency: 'brl',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        eventId: order.eventId,
        userId,
      },
      description: `plusTicket - ${order.event.title} - Pedido ${order.orderNumber}`,
    });

    // Salvar payment no banco
    const payment = await prisma.payment.create({
      data: {
        method: paymentMethod,
        status: 'PROCESSING',
        amount: order.finalAmount,
        currency: 'BRL',
        stripePaymentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        orderId: order.id,
      },
    });

    logger.info(`PaymentIntent criado: ${paymentIntent.id} para pedido ${order.orderNumber}`);

    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      stripePaymentId: paymentIntent.id,
      amount: Number(order.finalAmount),
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Processar webhook do Stripe
   */
  async handleWebhook(event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        logger.debug(`Webhook Stripe não tratado: ${event.type}`);
    }
  }

  /**
   * Pagamento confirmado
   */
  async handlePaymentSuccess(paymentIntent) {
    const { orderId } = paymentIntent.metadata;

    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) {
      logger.warn(`Payment não encontrado para Stripe PI: ${paymentIntent.id}`);
      return;
    }

    // Atualizar em transação
    await prisma.$transaction(async (tx) => {
      // Atualizar payment
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', paidAt: new Date() },
      });

      // Confirmar order
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'CONFIRMED' },
      });

      // Confirmar todos os tickets do pedido
      await tx.ticket.updateMany({
        where: { orderId: payment.orderId },
        data: { status: 'PAID' },
      });
    });

    // Buscar dados completos para jobs
    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      include: {
        tickets: {
          include: {
            event: true,
            ticketType: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true } },
      },
    });

    // Agendar jobs assíncronos (PDF + E-mail)
    for (const ticket of order.tickets) {
      try {
        await addPdfJob({
          ticketId: ticket.id,
          code: ticket.code,
          eventTitle: ticket.event.title,
        });

        await addEmailJob({
          type: 'TICKET_CONFIRMED',
          to: ticket.holderEmail,
          data: {
            holderName: ticket.holderName,
            ticketCode: ticket.code,
            eventTitle: ticket.event.title,
            eventVenue: ticket.event.venue,
            eventDate: ticket.event.date,
            ticketType: ticket.ticketType.name,
            ticketId: ticket.id,
          },
        });
      } catch (err) {
        logger.error(`Erro ao agendar jobs para ticket ${ticket.code}:`, err);
      }
    }

    // Emitir via WebSocket
    emitTicketSold(order.eventId, {
      orderNumber: order.orderNumber,
      ticketCount: order.tickets.length,
      eventId: order.eventId,
      timestamp: new Date(),
    });

    logger.info(`Pagamento confirmado: Pedido ${order.orderNumber}`);
  }

  /**
   * Pagamento falhou
   */
  async handlePaymentFailed(paymentIntent) {
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failedAt: new Date() },
      });

      logger.warn(`Pagamento falhou: PI ${paymentIntent.id}`);
    }
  }

  /**
   * Obter status do pagamento
   */
  async getPaymentStatus(paymentId, userId) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: { id: true, orderNumber: true, userId: true, status: true },
        },
      },
    });

    if (!payment) {
      throw Object.assign(new Error('Pagamento não encontrado'), { statusCode: 404 });
    }

    if (payment.order.userId !== userId) {
      throw Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    }

    return {
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: Number(payment.amount),
      currency: payment.currency,
      paidAt: payment.paidAt,
      orderNumber: payment.order.orderNumber,
      orderStatus: payment.order.status,
    };
  }
}

module.exports = new PaymentsService();
