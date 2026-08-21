const { prisma } = require('../../config/database');
const refundPaymentService = require('../../services/refundService');
const { addEmailJob } = require('../../jobs/queues');
const logger = require('../../utils/logger');

/**
 * Dias de prazo para reembolso integral
 */
const FULL_REFUND_DAYS = 7;
const FULL_REFUND_PERCENT = 100;
const PARTIAL_REFUND_PERCENT = 50;

class RefundsService {
  /**
   * Calcular porcentagem de reembolso com base na data de compra
   * @param {Date} purchaseDate - Data de criação do ticket
   * @returns {{ percent: number, isFullRefund: boolean }}
   */
  calculateRefundPercent(purchaseDate) {
    const now = new Date();
    const diffMs = now.getTime() - new Date(purchaseDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= FULL_REFUND_DAYS) {
      return { percent: FULL_REFUND_PERCENT, isFullRefund: true };
    }
    return { percent: PARTIAL_REFUND_PERCENT, isFullRefund: false };
  }

  /**
   * Solicitar devolução/reembolso de um ingresso
   *
   * Regras:
   * 1. Ingresso deve estar com status PAID
   * 2. Não pode ter check-in realizado
   * 3. Não pode ter transferência pendente
   * 4. Não pode já ter reembolso existente
   * 5. Até 7 dias → 100% | Após 7 dias → 50%
   */
  async requestRefund(ticketId, userId, reason) {
    // 1. Buscar ingresso completo
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: { id: true, title: true, date: true, venue: true },
        },
        ticketType: {
          select: { id: true, name: true, price: true },
        },
        order: {
          include: {
            payment: {
              select: { id: true, stripePaymentId: true },
            },
          },
        },
        checkIn: true,
        transfers: {
          where: { status: 'PENDING' },
        },
        refund: true,
      },
    });

    if (!ticket) {
      throw Object.assign(new Error('Ingresso não encontrado'), { statusCode: 404 });
    }

    // 2. Verificar propriedade
    if (ticket.userId !== userId) {
      throw Object.assign(new Error('Apenas o titular do ingresso pode solicitar a devolução'), { statusCode: 403 });
    }

    // 3. Verificar status
    if (ticket.status !== 'PAID') {
      throw Object.assign(
        new Error(`Apenas ingressos pagos podem ser devolvidos. Status atual: ${ticket.status}`),
        { statusCode: 400 }
      );
    }

    // 4. Verificar check-in
    if (ticket.checkIn) {
      throw Object.assign(
        new Error('Este ingresso já foi utilizado no check-in e não pode ser devolvido'),
        { statusCode: 400 }
      );
    }

    // 5. Verificar transferência pendente
    if (ticket.transfers && ticket.transfers.length > 0) {
      throw Object.assign(
        new Error('Este ingresso possui uma transferência pendente. Cancele a transferência antes de solicitar a devolução.'),
        { statusCode: 400 }
      );
    }

    // 6. Verificar reembolso já existente
    if (ticket.refund) {
      throw Object.assign(
        new Error(`Já existe uma solicitação de reembolso para este ingresso (Status: ${ticket.refund.status})`),
        { statusCode: 400 }
      );
    }

    // 7. Calcular valor de reembolso
    const originalAmount = Number(ticket.ticketType.price);
    const { percent, isFullRefund } = this.calculateRefundPercent(ticket.createdAt);
    const refundAmount = Number(((originalAmount * percent) / 100).toFixed(2));

    logger.info(
      `Reembolso calculado: Ticket ${ticket.code} | Original: R$ ${originalAmount.toFixed(2)} | ` +
      `${percent}% → R$ ${refundAmount.toFixed(2)} | Dias desde compra: ${Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24))}`
    );

    // 8. Criar registro de reembolso
    const refund = await prisma.refund.create({
      data: {
        ticketId,
        orderId: ticket.order.id,
        userId,
        originalAmount,
        refundPercent: percent,
        refundAmount,
        reason: reason || null,
        status: 'PENDING',
      },
    });

    // 9. Processar reembolso financeiro (stub ou Stripe real)
    const paymentResult = await refundPaymentService.processRefund({
      refundId: refund.id,
      amount: refundAmount,
      originalPaymentId: ticket.order.payment?.stripePaymentId || null,
    });

    if (!paymentResult.success) {
      // Marcar como rejeitado se o processamento falhou
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'REJECTED' },
      });
      throw Object.assign(
        new Error(`Falha ao processar reembolso: ${paymentResult.message}`),
        { statusCode: 500 }
      );
    }

    // 10. Transação: atualizar ticket + ticketType.sold + refund status
    await prisma.$transaction([
      // Atualizar status do ingresso para REFUNDED
      prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'REFUNDED' },
      }),
      // Devolver vaga ao lote (decrementar sold)
      prisma.ticketType.update({
        where: { id: ticket.ticketType.id },
        data: { sold: { decrement: 1 } },
      }),
      // Finalizar reembolso
      prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          externalRefundId: paymentResult.externalRefundId,
        },
      }),
    ]);

    // 11. Enfileirar e-mail de confirmação de reembolso (se Redis disponível)
    try {
      await addEmailJob({
        type: 'REFUND_CONFIRMED',
        to: ticket.holderEmail,
        data: {
          holderName: ticket.holderName,
          ticketCode: ticket.code,
          eventTitle: ticket.event.title,
          ticketType: ticket.ticketType.name,
          originalAmount: originalAmount.toFixed(2),
          refundPercent: percent,
          refundAmount: refundAmount.toFixed(2),
          isFullRefund,
        },
      });
    } catch (err) {
      logger.warn('Não foi possível enfileirar e-mail de reembolso:', err.message);
    }

    logger.info(
      `✅ Reembolso processado: Ticket ${ticket.code} | R$ ${refundAmount.toFixed(2)} (${percent}%) | ` +
      `Ref: ${paymentResult.externalRefundId}`
    );

    return {
      refundId: refund.id,
      ticketCode: ticket.code,
      eventTitle: ticket.event.title,
      ticketType: ticket.ticketType.name,
      originalAmount,
      refundPercent: percent,
      refundAmount,
      isFullRefund,
      status: 'PROCESSED',
      externalRefundId: paymentResult.externalRefundId,
      processedAt: new Date(),
    };
  }

  /**
   * Listar reembolsos do usuário
   */
  async getMyRefunds(userId) {
    const refunds = await prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: {
            id: true,
            code: true,
            holderName: true,
            event: {
              select: { id: true, title: true, date: true },
            },
            ticketType: {
              select: { name: true, price: true },
            },
          },
        },
      },
    });

    return refunds;
  }
}

module.exports = new RefundsService();
