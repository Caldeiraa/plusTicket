const IORedis = require('ioredis');
const logger = require('../utils/logger');

let redisConnection = null;
let redisAvailable = false;

async function initRedis() {
  try {
    const conn = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null, // Não tentar reconectar
    });

    // Handler ANTES do connect() para evitar "Unhandled error event"
    conn.on('error', () => {});

    await conn.connect();
    redisConnection = conn;
    redisAvailable = true;
    logger.info('✅ Redis conectado com sucesso');
    return true;
  } catch (err) {
    logger.warn('⚠️  Redis indisponível. Filas de jobs (PDF, E-mail) desativadas. O servidor funcionará normalmente.');
    return false;
  }
}

function getRedisConnection() {
  return redisConnection;
}

function isRedisAvailable() {
  return redisAvailable;
}

module.exports = { initRedis, getRedisConnection, isRedisAvailable };
