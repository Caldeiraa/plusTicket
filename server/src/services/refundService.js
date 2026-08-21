const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Serviço de processamento financeiro de reembolso.
 *
 * MODO ATUAL: Stub/Simulação — retorna um ID fake de reembolso.
 *
 * PARA INTEGRAR COM STRIPE REAL:
 * 1. Importar o SDK do Stripe: const { stripe } = require('../config/stripe');
 * 2. Substituir o corpo de processRefund() pelo código comentado abaixo.
 * 3. O restante do sistema (refunds.service.js, controller, routes) não precisa mudar.
 */

class RefundPaymentService {
  /**
   * Processar reembolso financeiro.
   *
   * @param {Object} params
   * @param {string} params.refundId - ID interno do Refund no banco
   * @param {number} params.amount - Valor a reembolsar (em reais, ex: 50.00)
   * @param {string|null} params.originalPaymentId - ID do pagamento original (Stripe PaymentIntent ID)
   * @returns {Promise<{ success: boolean, externalRefundId: string|null, message: string }>}
   */
  async processRefund({ refundId, amount, originalPaymentId }) {
    logger.info(`[RefundService] Processando reembolso #${refundId} - R$ ${amount.toFixed(2)}`);

    // =====================================================================
    // MODO STUB (simulação) — Remover ao integrar com Stripe
    // =====================================================================
    const fakeExternalId = `rf_stub_${uuidv4().substring(0, 12)}`;

    logger.info(`[RefundService] ✅ Reembolso simulado com sucesso: ${fakeExternalId}`);

    return {
      success: true,
      externalRefundId: fakeExternalId,
      message: 'Reembolso processado com sucesso (modo simulação)',
    };

    // =====================================================================
    // MODO STRIPE REAL — Descomentar ao ativar pagamentos reais
    // =====================================================================
    // try {
    //   const stripeRefund = await stripe.refunds.create({
    //     payment_intent: originalPaymentId,
    //     amount: Math.round(amount * 100), // Stripe usa centavos
    //     metadata: { refundId },
    //   });
    //
    //   logger.info(`[RefundService] ✅ Stripe Refund criado: ${stripeRefund.id}`);
    //
    //   return {
    //     success: true,
    //     externalRefundId: stripeRefund.id,
    //     message: 'Reembolso processado via Stripe',
    //   };
    // } catch (error) {
    //   logger.error(`[RefundService] ❌ Erro ao processar reembolso no Stripe:`, error);
    //
    //   return {
    //     success: false,
    //     externalRefundId: null,
    //     message: error.message || 'Falha ao processar reembolso no Stripe',
    //   };
    // }
  }
}

module.exports = new RefundPaymentService();
