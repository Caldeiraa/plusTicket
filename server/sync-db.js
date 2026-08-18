const { prisma } = require('./src/config/database');

async function syncDb() {
  try {
    console.log('Adicionando colunas serviceFee e transferCount se não existirem...');
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE orders ADD COLUMN serviceFee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER totalAmount;
      `);
      console.log('✅ Coluna serviceFee adicionada em orders');
    } catch (e) {
      console.log('ℹ️ Coluna serviceFee já existe em orders ou foi criada');
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE tickets ADD COLUMN transferCount INT NOT NULL DEFAULT 0;
      `);
      console.log('✅ Coluna transferCount adicionada em tickets');
    } catch (e) {
      console.log('ℹ️ Coluna transferCount já existe em tickets');
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ticket_transfers (
          id VARCHAR(50) PRIMARY KEY,
          ticketId VARCHAR(50) NOT NULL,
          senderId VARCHAR(50) NOT NULL,
          receiverId VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          expiresAt DATETIME NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE,
          FOREIGN KEY (senderId) REFERENCES users(id),
          FOREIGN KEY (receiverId) REFERENCES users(id)
        );
      `);
      console.log('✅ Tabela ticket_transfers criada com sucesso');
    } catch (e) {
      console.log('ℹ️ Tabela ticket_transfers já existe:', e.message);
    }

    console.log('Finalizado com sucesso!');
  } catch (err) {
    console.error('Erro na sincronização:', err);
  } finally {
    await prisma.$disconnect();
  }
}

syncDb();
