-- ============================================
-- CRIAÇÃO DO BANCO DE DADOS
-- ============================================
DROP DATABASE IF EXISTS plusticket;
CREATE DATABASE plusticket;
USE plusticket;

-- ============================================
-- TABELA DE USUÁRIOS
-- ============================================
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'ORGANIZER', 'ATTENDEE') DEFAULT 'ATTENDEE',
    phone VARCHAR(20),
    avatarUrl VARCHAR(500),
    isActive BOOLEAN DEFAULT true,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA DE EVENTOS
-- ============================================
CREATE TABLE events (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    shortDesc VARCHAR(500),
    venue VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zipCode VARCHAR(10),
    date DATETIME NOT NULL,
    endDate DATETIME,
    doorsOpen DATETIME,
    imageUrl VARCHAR(500),
    status ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED') DEFAULT 'DRAFT',
    capacity INT NOT NULL,
    isOnline BOOLEAN DEFAULT false,
    onlineUrl VARCHAR(500),
    organizerId VARCHAR(50) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizerId) REFERENCES users(id)
);

-- ============================================
-- TIPOS DE INGRESSOS (LOTES)
-- ============================================
CREATE TABLE ticket_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    sold INT DEFAULT 0,
    maxPerUser INT DEFAULT 5,
    salesStart DATETIME,
    salesEnd DATETIME,
    isActive BOOLEAN DEFAULT true,
    eventId VARCHAR(50) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
);

-- ============================================
-- TABELA DE PEDIDOS
-- ============================================
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    orderNumber VARCHAR(30) UNIQUE NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED') DEFAULT 'PENDING',
    totalAmount DECIMAL(10,2) NOT NULL,
    discountAmount DECIMAL(10,2) DEFAULT 0.00,
    finalAmount DECIMAL(10,2) NOT NULL,
    userId VARCHAR(50) NOT NULL,
    eventId VARCHAR(50) NOT NULL,
    expiresAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (eventId) REFERENCES events(id)
);

-- ============================================
-- ITENS DO PEDIDO
-- ============================================
CREATE TABLE order_items (
    id VARCHAR(50) PRIMARY KEY,
    quantity INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    totalPrice DECIMAL(10,2) NOT NULL,
    orderId VARCHAR(50) NOT NULL,
    ticketTypeId VARCHAR(50) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (ticketTypeId) REFERENCES ticket_types(id)
);

-- ============================================
-- TABELA DE INGRESSOS
-- ============================================
CREATE TABLE tickets (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    qrCode TEXT NOT NULL,
    qrCodeUrl VARCHAR(500),
    pdfUrl VARCHAR(500),
    status ENUM('PENDING', 'PAID', 'USED', 'CANCELLED', 'REFUNDED') DEFAULT 'PENDING',
    holderName VARCHAR(255) NOT NULL,
    holderEmail VARCHAR(255) NOT NULL,
    holderDoc VARCHAR(20),
    eventId VARCHAR(50) NOT NULL,
    ticketTypeId VARCHAR(50) NOT NULL,
    userId VARCHAR(50) NOT NULL,
    orderId VARCHAR(50) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (eventId) REFERENCES events(id),
    FOREIGN KEY (ticketTypeId) REFERENCES ticket_types(id),
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (orderId) REFERENCES orders(id)
);

-- ============================================
-- TABELA DE PAGAMENTOS
-- ============================================
CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY,
    externalId VARCHAR(255) UNIQUE,
    method ENUM('CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO') DEFAULT 'CREDIT_CARD',
    status ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    stripePaymentId VARCHAR(255),
    stripeClientSecret VARCHAR(255),
    metadata JSON,
    paidAt DATETIME,
    failedAt DATETIME,
    refundedAt DATETIME,
    orderId VARCHAR(50) UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id)
);

-- ============================================
-- TABELA DE CHECK-IN DA PORTARIA
-- ============================================
CREATE TABLE check_ins (
    id VARCHAR(50) PRIMARY KEY,
    checkedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    checkedBy VARCHAR(255),
    gate VARCHAR(50),
    notes VARCHAR(500),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    ticketId VARCHAR(50) UNIQUE NOT NULL,
    eventId VARCHAR(50) NOT NULL,
    userId VARCHAR(50) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticketId) REFERENCES tickets(id),
    FOREIGN KEY (eventId) REFERENCES events(id),
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- ============================================
-- INSERÇÃO DE DADOS DE TESTE
-- ============================================
INSERT INTO users (id, name, email, password, role, phone) VALUES 
('usr-admin-001', 'Admin plusTicket', 'admin@plusticket.com', '$2a$12$kPyF1vUhhSVDwN.n2PkWue3w4Nl2dG2jYd8L2t1hD1fX9F1W9uP4m', 'ADMIN', '(11) 99999-0000'),
('usr-org-001', 'Carlos Organizador', 'organizador@plusticket.com', '$2a$10$1WbMvhb8dY6uXQpXQyM1u.GZq7NqJgB6Oq0uXQpXQyM1u.GZq7NqJ', 'ORGANIZER', '(11) 98888-1111'),
('usr-att-001', 'Maria Participante', 'participante@email.com', '$2a$10$1WbMvhb8dY6uXQpXQyM1u.GZq7NqJgB6Oq0uXQpXQyM1u.GZq7NqJ', 'ATTENDEE', '(21) 97777-2222');

INSERT INTO events (id, title, slug, description, shortDesc, venue, address, city, state, date, imageUrl, status, capacity, organizerId) VALUES 
('evt-001', 'Festival Tech & Music 2026', 'festival-tech-music-2026', 'O maior festival de tecnologia e música ao vivo.', 'O maior festival de tecnologia e música ao vivo.', 'Arena Anhembi', 'Av. Olavo Fontoura, 1209 - Santana', 'São Paulo', 'SP', '2026-09-20 18:00:00', 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80', 'PUBLISHED', 2000, 'usr-org-001'),
('evt-002', 'Conferência React & Web 2026', 'conferencia-react-web-2026', 'Um dia inteiro imerso nas novas tecnologias de frontend.', 'Conferência completa de desenvolvimento Web.', 'Centro de Convenções Rebouças', 'Av. Rebouças, 600 - Pinheiros', 'São Paulo', 'SP', '2026-10-10 09:00:00', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80', 'PUBLISHED', 500, 'usr-org-001');

INSERT INTO ticket_types (id, name, description, price, quantity, sold, maxPerUser, eventId) VALUES 
('tkt-type-001', 'Pista Lote 1', 'Acesso à área geral do festival', 80.00, 1000, 0, 5, 'evt-001'),
('tkt-type-002', 'Área VIP Lote 1', 'Acesso exclusivo em frente ao palco', 220.00, 300, 0, 4, 'evt-001'),
('tkt-type-003', 'Ingresso Geral', 'Acesso a todas as palestras do evento', 150.00, 500, 0, 5, 'evt-002');
