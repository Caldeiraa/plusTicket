const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { getEmailQueue, getPdfQueue, getPaymentQueue } = require('./queues');

/**
 * Configura o Bull Board para monitorar filas (só se Redis estiver disponível)
 */
function setupBullBoard(app) {
  const eq = getEmailQueue();
  const pq = getPdfQueue();
  const pyq = getPaymentQueue();

  if (!eq && !pq && !pyq) {
    // Redis offline: criar rota placeholder
    app.use('/admin/queues', (req, res) => {
      res.json({ message: 'Bull Board indisponível (Redis não conectado)' });
    });
    return;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queues = [];
  if (eq) queues.push(new BullMQAdapter(eq));
  if (pq) queues.push(new BullMQAdapter(pq));
  if (pyq) queues.push(new BullMQAdapter(pyq));

  createBullBoard({
    queues,
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  return serverAdapter;
}

module.exports = { setupBullBoard };
