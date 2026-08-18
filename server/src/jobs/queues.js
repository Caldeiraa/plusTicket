const { Queue } = require('bullmq');
const { getRedisConnection, isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');

// ============================================
// DEFINIÇÃO DAS FILAS (só criadas se Redis disponível)
// ============================================

let emailQueue = null;
let pdfQueue = null;
let paymentQueue = null;

function initQueues() {
  const connection = getRedisConnection();
  if (!connection || !isRedisAvailable()) {
    logger.warn('⚠️  Filas BullMQ não criadas (Redis indisponível).');
    return;
  }

  emailQueue = new Queue('email-queue', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  pdfQueue = new Queue('pdf-queue', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 30 },
    },
  });

  paymentQueue = new Queue('payment-queue', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  emailQueue.on('error', () => {});
  pdfQueue.on('error', () => {});
  paymentQueue.on('error', () => {});

  logger.info('✅ Filas BullMQ criadas');
}

// ============================================
// FUNÇÕES DE ADIÇÃO DE JOBS (seguras quando sem Redis)
// ============================================

async function addEmailJob(data) {
  if (!emailQueue) {
    logger.warn('📧 Job de e-mail ignorado (Redis indisponível)');
    return null;
  }
  const job = await emailQueue.add('send-email', data, {
    jobId: `email-${data.type}-${data.to}-${Date.now()}`,
  });
  logger.debug(`📧 Job de e-mail adicionado: ${job.id}`);
  return job;
}

async function addPdfJob(data) {
  if (!pdfQueue) {
    logger.warn('📄 Job de PDF ignorado (Redis indisponível)');
    return null;
  }
  const job = await pdfQueue.add('generate-pdf', data, {
    jobId: `pdf-${data.ticketId}-${Date.now()}`,
  });
  logger.debug(`📄 Job de PDF adicionado: ${job.id}`);
  return job;
}

async function addPaymentJob(data) {
  if (!paymentQueue) {
    logger.warn('💳 Job de pagamento ignorado (Redis indisponível)');
    return null;
  }
  const job = await paymentQueue.add('process-payment', data, {
    jobId: `payment-${data.paymentId}-${Date.now()}`,
  });
  logger.debug(`💳 Job de pagamento adicionado: ${job.id}`);
  return job;
}

function getEmailQueue() { return emailQueue; }
function getPdfQueue() { return pdfQueue; }
function getPaymentQueue() { return paymentQueue; }

module.exports = {
  initQueues,
  getEmailQueue,
  getPdfQueue,
  getPaymentQueue,
  addEmailJob,
  addPdfJob,
  addPaymentJob,
  // Manter compatibilidade com imports antigos
  get emailQueue() { return emailQueue; },
  get pdfQueue() { return pdfQueue; },
  get paymentQueue() { return paymentQueue; },
};
