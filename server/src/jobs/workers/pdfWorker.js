const { Worker } = require('bullmq');
const { getRedisConnection, isRedisAvailable } = require('../../config/redis');
const { prisma } = require('../../config/database');
const { generateTicketPDF, savePDF } = require('../../services/pdfGenerator');
const { addEmailJob } = require('../queues');
const logger = require('../../utils/logger');

/**
 * Worker de geração de PDF de ingressos
 */
function startPdfWorker() {
  if (!isRedisAvailable()) {
    logger.warn('⚠️  PDF Worker não iniciado (Redis indisponível)');
    return;
  }

  const worker = new Worker(
    'pdf-queue',
    async (job) => {
      const { ticketId, code, eventTitle } = job.data;

      logger.info(`📄 Gerando PDF para ticket: ${code}`);

      // Buscar dados completos do ticket
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          event: true,
          ticketType: true,
          user: { select: { name: true, email: true } },
        },
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} não encontrado`);
      }

      // Gerar PDF
      const pdfBuffer = await generateTicketPDF(ticket);
      const filename = `ingresso-${ticket.code}.pdf`;
      const filePath = savePDF(pdfBuffer, filename);

      // Atualizar ticket com path do PDF
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { pdfUrl: `/uploads/tickets/${filename}` },
      });

      // Adicionar job de e-mail com PDF anexo
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
          pdfPath: filePath,
        },
      });

      logger.info(`📄 PDF gerado e salvo: ${filename}`);
      return { generated: true, filename, ticketId };
    },
    {
      connection: getRedisConnection(),
      concurrency: 2, // PDF é CPU-intensive, manter baixo
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`📄 PDF Job concluído: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`📄 PDF Job falhou: ${job?.id} - ${err.message}`);
  });

  logger.info('✅ PDF Worker iniciado');
  return worker;
}

module.exports = { startPdfWorker };
