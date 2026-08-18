const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io;

/**
 * Inicializa o Socket.IO com o servidor HTTP
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Namespace para dashboard em tempo real
  const dashboardNs = io.of('/dashboard');

  dashboardNs.on('connection', (socket) => {
    logger.info(`📡 Dashboard client conectado: ${socket.id}`);

    // Entrar no room do evento para receber updates
    socket.on('join:event', (eventId) => {
      socket.join(`event:${eventId}`);
      logger.info(`📡 Client ${socket.id} entrou no room event:${eventId}`);
    });

    // Sair do room do evento
    socket.on('leave:event', (eventId) => {
      socket.leave(`event:${eventId}`);
      logger.info(`📡 Client ${socket.id} saiu do room event:${eventId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`📡 Dashboard client desconectado: ${socket.id} - ${reason}`);
    });
  });

  logger.info('✅ Socket.IO inicializado');
  return io;
}

/**
 * Retorna a instância do Socket.IO
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO não foi inicializado. Chame initSocket() primeiro.');
  }
  return io;
}

/**
 * Emite evento de check-in para o room do evento
 */
function emitCheckIn(eventId, checkInData) {
  if (!io) return;
  io.of('/dashboard').to(`event:${eventId}`).emit('checkin:new', checkInData);
}

/**
 * Emite estatísticas atualizadas para o room do evento
 */
function emitStats(eventId, stats) {
  if (!io) return;
  io.of('/dashboard').to(`event:${eventId}`).emit('checkin:stats', stats);
}

/**
 * Emite evento de venda de ingresso
 */
function emitTicketSold(eventId, ticketData) {
  if (!io) return;
  io.of('/dashboard').to(`event:${eventId}`).emit('ticket:sold', ticketData);
}

module.exports = { initSocket, getIO, emitCheckIn, emitStats, emitTicketSold };
