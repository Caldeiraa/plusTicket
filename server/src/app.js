const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middlewares/errorHandler');
const { setupBullBoard } = require('./jobs/bullboard');

// Importar rotas
const authRoutes = require('./modules/auth/auth.routes');
const eventsRoutes = require('./modules/events/events.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const checkInRoutes = require('./modules/checkin/checkin.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const refundsRoutes = require('./modules/refunds/refunds.routes');
const auditLogRoutes = require('./modules/auditlog/auditlog.routes');

const app = express();

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging HTTP
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing (exceto webhook que precisa de raw body)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (PDFs de ingressos)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ============================================
// ROTAS DA API
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/checkin', checkInRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/refunds', refundsRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// ============================================
// BULL BOARD (monitoramento de filas)
// ============================================

setupBullBoard(app);

// ============================================
// ROTA DE HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'plusTicket API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: '🎫 plusTicket API',
    version: '1.0.0',
    docs: '/api/health',
    queues: '/admin/queues',
    endpoints: {
      auth: '/api/auth',
      events: '/api/events',
      tickets: '/api/tickets',
      payments: '/api/payments',
      checkin: '/api/checkin',
      dashboard: '/api/dashboard',
      refunds: '/api/refunds',
      auditLogs: '/api/audit-logs',
    },
  });
});

// ============================================
// 404 Handler
// ============================================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.originalUrl} não encontrada`,
  });
});

// ============================================
// ERROR HANDLER (deve ser o último)
// ============================================

app.use(errorHandler);

module.exports = app;
