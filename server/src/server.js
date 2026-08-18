require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
const { initEmailTransporter } = require('./config/email');
const { prisma } = require('./config/database');
const { initRedis } = require('./config/redis');
const { initQueues } = require('./jobs/queues');
const { startEmailWorker } = require('./jobs/workers/emailWorker');
const { startPdfWorker } = require('./jobs/workers/pdfWorker');
const { startPaymentWorker } = require('./jobs/workers/paymentWorker');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 1. Testar conexão com o banco
    await prisma.$connect();
    logger.info('✅ Banco de dados (MariaDB/MySQL) conectado');

    // 2. Criar servidor HTTP
    const server = http.createServer(app);

    // 3. Inicializar Socket.IO
    initSocket(server);

    // 4. Inicializar transporter de e-mail
    await initEmailTransporter();

    // 5. Tentar conectar ao Redis (opcional)
    await initRedis();

    // 6. Inicializar filas BullMQ (só se Redis conectou)
    initQueues();

    // 7. Iniciar workers BullMQ (só se Redis conectou)
    try {
      startEmailWorker();
      startPdfWorker();
      startPaymentWorker();
    } catch (err) {
      logger.warn('⚠️  Workers BullMQ não iniciados:', err.message);
    }

    // 6. Iniciar servidor
    server.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🎫 plusTicket API v1.0.0                       ║
║                                                  ║
║   🌐 Server:    http://localhost:${PORT}            ║
║   📊 Queues:    http://localhost:${PORT}/admin/queues║
║   💚 Health:    http://localhost:${PORT}/api/health  ║
║   🔌 WebSocket: ws://localhost:${PORT}/dashboard    ║
║                                                  ║
║   📦 Ambiente: ${process.env.NODE_ENV || 'development'}                     ║
║                                                  ║
╚══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} recebido. Encerrando...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Servidor encerrado');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
