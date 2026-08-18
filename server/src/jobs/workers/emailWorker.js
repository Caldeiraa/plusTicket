const { Worker } = require('bullmq');
const { getRedisConnection, isRedisAvailable } = require('../../config/redis');
const { sendEmail } = require('../../config/email');
const logger = require('../../utils/logger');

/**
 * Worker de envio de e-mails
 */
function startEmailWorker() {
  if (!isRedisAvailable()) {
    logger.warn('⚠️  Email Worker não iniciado (Redis indisponível)');
    return;
  }

  const worker = new Worker(
    'email-queue',
    async (job) => {
      const { type, to, data } = job.data;

      logger.info(`📧 Processando e-mail: ${type} para ${to}`);

      let subject = '';
      let html = '';

      switch (type) {
        case 'TICKET_CONFIRMED':
          subject = `🎫 Seu ingresso para ${data.eventTitle} está confirmado!`;
          html = buildTicketConfirmedEmail(data);
          break;

        case 'WELCOME':
          subject = '🎉 Bem-vindo ao plusTicket!';
          html = buildWelcomeEmail(data);
          break;

        case 'ORDER_CONFIRMED':
          subject = `✅ Pedido confirmado - ${data.orderNumber}`;
          html = buildOrderConfirmedEmail(data);
          break;

        default:
          subject = 'Notificação plusTicket';
          html = `<p>${JSON.stringify(data)}</p>`;
      }

      const attachments = [];

      // Se tem PDF do ticket, anexar
      if (data.pdfPath) {
        attachments.push({
          filename: `ingresso-${data.ticketCode}.pdf`,
          path: data.pdfPath,
        });
      }

      await sendEmail({ to, subject, html, attachments });

      logger.info(`📧 E-mail enviado: ${type} para ${to}`);
      return { sent: true, to, type };
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000, // Máx 10 e-mails por segundo
      },
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`📧 Job concluído: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`📧 Job falhou: ${job?.id} - ${err.message}`);
  });

  logger.info('✅ Email Worker iniciado');
  return worker;
}

// ============================================
// TEMPLATES DE E-MAIL (HTML inline)
// ============================================

function buildTicketConfirmedEmail(data) {
  const eventDate = new Date(data.eventDate).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
        <h1 style="color: #e94560; margin: 0; font-size: 28px;">plus<span style="color: #fff;">Ticket</span></h1>
      </div>
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1a1a2e; margin-top: 0;">🎫 Ingresso Confirmado!</h2>
        <p style="color: #555; font-size: 16px;">Olá <strong>${data.holderName}</strong>,</p>
        <p style="color: #555;">Seu ingresso para o evento foi confirmado com sucesso!</p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1a1a2e; margin-top: 0;">${data.eventTitle}</h3>
          <p style="margin: 5px 0; color: #666;">📍 <strong>${data.eventVenue}</strong></p>
          <p style="margin: 5px 0; color: #666;">📅 ${eventDate}</p>
          <p style="margin: 5px 0; color: #666;">🎫 ${data.ticketType}</p>
          <p style="margin: 5px 0; color: #888; font-size: 13px;">Código: <strong>${data.ticketCode}</strong></p>
        </div>
        <p style="color: #555;">O PDF do seu ingresso com QR Code está anexado neste e-mail.</p>
        <p style="color: #888; font-size: 13px;">Apresente o QR Code na entrada do evento para fazer o check-in.</p>
      </div>
      <div style="background: #1a1a2e; padding: 20px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">plusTicket © 2026 — Gestão de Eventos</p>
      </div>
    </div>
  `;
}

function buildWelcomeEmail(data) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
        <h1 style="color: #e94560; margin: 0; font-size: 28px;">plus<span style="color: #fff;">Ticket</span></h1>
      </div>
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1a1a2e;">🎉 Bem-vindo ao plusTicket!</h2>
        <p style="color: #555;">Olá <strong>${data.name}</strong>, sua conta foi criada com sucesso!</p>
        <p style="color: #555;">Agora você pode comprar ingressos e participar de eventos incríveis.</p>
      </div>
    </div>
  `;
}

function buildOrderConfirmedEmail(data) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
        <h1 style="color: #e94560; margin: 0; font-size: 28px;">plus<span style="color: #fff;">Ticket</span></h1>
      </div>
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1a1a2e;">✅ Pedido Confirmado!</h2>
        <p style="color: #555;">Pedido <strong>${data.orderNumber}</strong> confirmado com sucesso.</p>
        <p style="color: #555;">Seus ingressos estão disponíveis na área "Meus Ingressos".</p>
      </div>
    </div>
  `;
}

module.exports = { startEmailWorker };
