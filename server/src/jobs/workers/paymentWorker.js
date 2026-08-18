const { Worker } = require('bullmq');
const { getRedisConnection, isRedisAvailable } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Worker de processamento de pagamentos
 * Tratamento de retentativas e falhas de pagamento
 */
function startPaymentWorker() {
  if (!isRedisAvailable()) {
    logger.warn('⚠️  Payment Worker não iniciado (Redis indisponível)');
    return;
  }

  const worker = new Worker(
    'payment-queue',
    async (job) => {
      const { paymentId, action } = job.data;

      logger.info(`💳 Processando pagamento: ${paymentId} - Ação: ${action}`);

      // Lógica adicional de processamento de pagamento
      // (ex: verificar status com Stripe, processar reembolsos, etc.)

      switch (action) {
        case 'verify':
          logger.info(`💳 Verificando pagamento ${paymentId}`);
          break;

        case 'refund':
          logger.info(`💳 Processando reembolso ${paymentId}`);
          break;

        default:
          logger.warn(`💳 Ação desconhecida: ${action}`);
      }

      return { processed: true, paymentId, action };
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`💳 Payment Job concluído: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`💳 Payment Job falhou: ${job?.id} - ${err.message}`);
  });

  logger.info('✅ Payment Worker iniciado');
  return worker;
}

module.exports = { startPaymentWorker };
