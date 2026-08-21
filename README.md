# 🎫 plusTicket

<div align="center">

![plusTicket Banner](https://img.shields.io/badge/plusTicket-Plataforma%20de%20Eventos-6366f1?style=for-the-badge&logo=ticketmaster&logoColor=white)

**Plataforma completa de gestão de eventos, venda de ingressos com QR Code e check-in com dashboard ao vivo via WebSockets.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL / MariaDB](https://img.shields.io/badge/MariaDB%20%2F%20MySQL-003545?style=flat-square&logo=mariadb&logoColor=white)](https://mariadb.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queues-CC0000?style=flat-square&logo=redis&logoColor=white)](https://bullmq.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

</div>

---

## 📌 Sumário

- [Visão Geral](#-visão-geral)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Modelo do Banco de Dados](#-modelo-do-banco-de-dados)
- [Rotas da API](#-rotas-da-api)
- [Como Executar Localmente](#-como-executar-localmente)
  - [Pré-requisitos](#pré-requisitos)
  - [Configuração do Backend (Server)](#1-configuração-do-backend-server)
  - [Configuração do Frontend (Client)](#2-configuração-do-frontend-client)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Painel de Monitoramento de Filas (Bull Board)](#-painel-de-monitoramento-de-filas-bull-board)
- [Licença](#-licença)

---

## 📖 Visão Geral

O **plusTicket** é uma solução *end-to-end* projetada para revolucionar o ciclo de vida de eventos presenciais e online:
1. **Participantes**: Podem explorar eventos, adquirir ingressos com opções variadas (Pista, VIP, Camarote), pagar com segurança (Stripe/PIX/Cartão), visualizar ingressos digitais com QR Code dinâmico e baixar PDFs com comprovantes.
2. **Organizadores**: Dispõem de painel gerencial com métricas ao vivo, controle de lotes/capacidade, ferramenta de check-in com leitor de QR Code via câmera do celular ou notebook e dashboard em tempo real via WebSockets.
3. **Processamento Assíncrono**: Geração de PDFs e envio de e-mails com tickets anexados executados em segundo plano utilizando Redis e filas BullMQ, garantindo altíssima performance e disponibilidade da API.

---

## 🚀 Principais Funcionalidades

### 🎟️ Para Participantes
- **Catálogo de Eventos**: Busca e visualização detalhada de atrações, horários, localização e lotes disponíveis.
- **Fluxo de Compra & Checkout**: Seleção de quantidades por lote, cálculo automático de taxas e pagamento integrado.
- **Meus Ingressos**: Carteira digital com QR Code interativo para apresentação na portaria.
- **Download de Ingressos em PDF**: Documento estilizado gerado via `PDFKit` contendo QR Code exclusivo e detalhes do titular.
- **Devolução / Reembolso de Ingressos**: Solicitação de devolução com cálculo automático — **100% até 7 dias** após a compra, **50% após 7 dias**. Interface com modal de confirmação mostrando o valor calculado e política de devolução.
- **Notificações por E-mail**: Envio automático de confirmação de pedido, ingressos em PDF e confirmação de reembolso.

### 🏢 Para Organizadores
- **Criação e Gestão de Eventos**: Definição de datas, lotes, capacidade, limite de compras por usuário e banners.
- **Scanner de Check-in em Tempo Real**: Leitor integrado com câmera web/mobile (`html5-qrcode`) e suporte a inserção manual de código com feedback sonoro e visual instantâneo.
- **Live Dashboard**: Acompanhamento de taxa de ocupação, entradas por minuto, vendas e últimas validações sem recarregar a página (via Socket.IO).
- **Controle de Acesso & RBAC**: Permissões estritas separadas entre `ATTENDEE` (Participante), `ORGANIZER` (Organizador) e `ADMIN` (Administrador).

### ⚙️ Arquitetura & Background Workers
- **Validação Robusta**: Esquemas de validação com `Zod` em todas as requisições de entrada.
- **Filas com BullMQ**:
  - `pdf-queue`: Geração assíncrona de arquivos PDF com QR Code.
  - `email-queue`: Disparo de e-mails transacionais com anexos.
  - `payment-queue`: Processamento e conciliação de transações.
- **Bull Board Dashboard**: Painel administrativo para inspecionar filas, retentar jobs com falha e analisar métricas de processamento em tempo real.

---

## 🛠️ Tecnologias Utilizadas

### Frontend (Client)
| Tecnologia | Descrição |
|---|---|
| **React 18** | Biblioteca para interfaces reativas e modulares |
| **Tailwind CSS** | Framework CSS utilitário com tema Dark Mode moderno |
| **React Router Dom 6** | Roteamento dinâmico com Guards de autenticação |
| **Socket.IO Client** | Conexão bidirecional em tempo real para os dashboards |
| **html5-qrcode / qrcode.react** | Leitura via câmera e renderização vetorial de QR Codes |
| **Lucide React** | Pacote moderno de ícones vetoriais |
| **Webpack 5 & Babel** | Bundling customizado, otimizado para produção |

### Backend (Server)
| Tecnologia | Descrição |
|---|---|
| **Node.js (v20+)** | Ambiente de execução JavaScript server-side |
| **Express 4.x** | Framework HTTP para arquitetura de API RESTful |
| **Prisma ORM** | Modelagem tipada e migrações para banco de dados |
| **MariaDB / MySQL** | Banco de dados relacional robusto e transacional |
| **Redis & BullMQ** | Gerenciamento e execução de filas em segundo plano |
| **Socket.IO** | Engine de WebSockets para métricas em tempo real |
| **Stripe SDK** | Processamento de pagamentos e webhooks seguros |
| **PDFKit & qrcode** | Geração e estilização de ingressos em PDF com QR Code |
| **Nodemailer** | Serviço de envio de e-mails com suporte a anexos |
| **JWT & bcryptjs** | Autenticação stateless segura e hash criptográfico |
| **Zod** | Validação estrita de contratos e payloads HTTP |
| **Winston & Morgan** | Sistema avançado de logging e auditoria |

---

## 🏗️ Arquitetura do Sistema

```
                        ┌─────────────────────────┐
                        │      Cliente React      │
                        │ (Web / Mobile Browser)  │
                        └────────────┬────────────┘
                                     │
                    HTTP REST (JSON) │ WebSockets (ws://)
                                     ▼
                        ┌─────────────────────────┐
                        │     API Express.js      │
                        │ (Middlewares/Controllers│
                        └──────┬───────────┬──────┘
                               │           │
                 Prisma Client │           │ Enfileiramento
                               ▼           ▼
                      ┌──────────────┐   ┌───────────────────┐
                      │ MariaDB /    │   │  Redis / BullMQ   │
                      │ MySQL        │   │ (Queues de Jobs)  │
                      └──────────────┘   └─────────┬─────────┘
                                                   │
                                          Workers Assíncronos
                                                   │
                                     ┌─────────────┼─────────────┐
                                     ▼             ▼             ▼
                                [PDFKit]     [Nodemailer]    [Stripe]
                               (Gera PDF)    (Envia Email)  (Pagamento)
```

---

## 📂 Estrutura do Projeto

```
plusTicket/
├── client/                      # Aplicação Frontend React
│   ├── public/                  # HTML template e assets estáticos
│   ├── src/
│   │   ├── api/                 # Configurações e instâncias de API
│   │   ├── components/          # Componentes visuais reutilizáveis
│   │   ├── context/             # AuthContext e SocketContext
│   │   ├── pages/               # Páginas da aplicação (Home, Scanner, Dashboard...)
│   │   ├── App.jsx              # Rotas e layout principal
│   │   └── index.js             # Entrada do React DOM
│   ├── package.json
│   ├── tailwind.config.js
│   └── webpack.config.js
│
├── server/                      # API Backend Node.js
│   ├── prisma/
│   │   ├── schema.prisma        # Definição do schema Prisma e entidades
│   │   └── seed.js              # Script de população do banco de dados
│   ├── src/
│   │   ├── config/              # Configurações de banco, Redis, e-mail e socket
│   │   ├── jobs/                # Filas, workers assíncronos e Bull Board
│   │   ├── middlewares/         # Auth, validação Zod e tratamento de erros
│   │   ├── modules/
│   │   │   ├── auth/            # Login, registro e renovação de token
│   │   │   ├── events/          # CRUD de eventos e pesquisa
│   │   │   ├── tickets/         # Reserva, compra e listagem de ingressos
│   │   │   ├── payments/        # Integração Stripe e webhooks
│   │   │   ├── checkin/         # Validação de QR Code na portaria
│   │   │   ├── dashboard/       # Métricas consolidadas e telemetria
│   │   │   └── refunds/         # Devolução e reembolso de ingressos
│   │   ├── services/            # Serviços de PDF, QR Code, e-mail e socket
│   │   ├── utils/               # Logger (Winston) e helpers
│   │   ├── app.js               # Configuração da aplicação Express
│   │   └── server.js            # Inicialização de servidores e conexões
│   ├── uploads/                 # Armazenamento de ingressos PDF gerados
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## 🗄️ Modelo do Banco de Dados

Principais entidades do sistema gerenciadas via **Prisma ORM**:

- **`User`**: Usuários cadastrados, com papéis (`ADMIN`, `ORGANIZER`, `ATTENDEE`).
- **`Event`**: Eventos criados com data, localização, capacidade e status.
- **`TicketType`**: Tipos/Lotes de ingressos (Pista, VIP, Camarote) com preço e cota máxima.
- **`Order` & `OrderItem`**: Pedidos de compra com controle de expiração e totalização.
- **`Ticket`**: Ingressos individuais com identificador único, payload de QR Code e status (`PENDING`, `PAID`, `USED`, `CANCELLED`, `REFUNDED`).
- **`Payment`**: Registro de pagamentos associados à ordem (Stripe PaymentIntent / PIX).
- **`CheckIn`**: Registro de entradas contendo timestamp, operador responsável e portão.
- **`TicketTransfer`**: Histórico e controle de transferências de titularidade de ingressos.
- **`Refund`**: Solicitações de reembolso com valor original, percentual (100% ou 50%), valor reembolsado, status e referência externa para Stripe.

---

## 🔌 Rotas da API

### 🔐 Autenticação (`/api/auth`)
- `POST /api/auth/register` — Cadastro de usuário
- `POST /api/auth/login` — Autenticação e geração de token JWT
- `GET /api/auth/me` — Obter dados do usuário logado

### 🎪 Eventos (`/api/events`)
- `GET /api/events` — Listagem e busca de eventos públicos
- `GET /api/events/:id` — Detalhes completos do evento e lotes
- `POST /api/events` — Criar novo evento *(Organizador/Admin)*
- `PUT /api/events/:id` — Atualizar evento *(Organizador/Admin)*
- `DELETE /api/events/:id` — Cancelar/excluir evento *(Organizador/Admin)*

### 🎟️ Ingressos (`/api/tickets`)
- `POST /api/tickets/purchase` — Iniciar fluxo de compra de ingressos
- `GET /api/tickets/my-tickets` — Listar ingressos do usuário autenticado
- `GET /api/tickets/:id/pdf` — Obter / baixar PDF do ingresso
- `POST /api/tickets/:id/transfer` — Transferir ingresso para outro e-mail

### 💳 Pagamentos (`/api/payments`)
- `POST /api/payments/create-intent` — Criar PaymentIntent no Stripe
- `POST /api/payments/webhook` — Webhook para confirmação assíncrona do Stripe

### 📲 Check-in na Portaria (`/api/checkin`)
- `POST /api/checkin` — Validar ingresso via código / QR Code
- `GET /api/checkin/event/:eventId` — Histórico de check-ins do evento

### 📊 Dashboard do Organizador (`/api/dashboard`)
- `GET /api/dashboard/overview` — Resumo geral de vendas e entradas
- `GET /api/dashboard/events/:eventId` — Métricas detalhadas de um evento específico

### 🔄 Devoluções / Reembolsos (`/api/refunds`)
- `POST /api/refunds/:ticketId` — Solicitar devolução de ingresso (100% até 7 dias / 50% após)
- `GET /api/refunds/my-refunds` — Listar reembolsos do usuário autenticado

---

## ⚡ Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 20.x ou superior)
- [MariaDB](https://mariadb.org/) ou [MySQL](https://www.mysql.com/) (porta 3306)
- [Redis](https://redis.io/) (porta 6379 — para filas e BullMQ)

---

### 1. Configuração do Backend (Server)

1. Acesse o diretório do servidor:
   ```bash
   cd server
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
   *Edite o arquivo `.env` com suas credenciais do banco de dados e Redis.*

4. Execute as migrações do Prisma e popule o banco (seeding):
   ```bash
   # Gera os tipos do Prisma Client
   npm run db:generate

   # Executa as migrações
   npm run db:migrate

   # (Opcional) Popula dados iniciais de teste
   npm run db:seed
   ```

5. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   > 🚀 O servidor iniciará por padrão em `http://localhost:3000`

---

### 2. Configuração do Frontend (Client)

1. Em um novo terminal, acesse o diretório do cliente:
   ```bash
   cd client
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento do Webpack:
   ```bash
   npm start
   ```
   > 🌐 O frontend abrirá automaticamente em `http://localhost:8080` (ou porta configurada)

---

## ⚙️ Variáveis de Ambiente

Exemplo de configuração para o arquivo `server/.env`:

```env
# Banco de Dados (MariaDB / MySQL)
DATABASE_URL="mysql://usuario:senha@localhost:3306/plusticket"

# Redis (Filas BullMQ)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# Autenticação JWT
JWT_SECRET="seu-segredo-jwt-super-seguro"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="seu-segredo-refresh-token"
JWT_REFRESH_EXPIRES_IN="30d"

# Stripe Pagamentos (Opcional para testes locais)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# E-mail (Nodemailer / Ethereal para testes)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER="seu-usuario-ethereal"
SMTP_PASS="sua-senha-ethereal"
SMTP_FROM="plusTicket <noreply@plusticket.com>"

# Servidor & CORS
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:8080"
```

---

## 📊 Painel de Monitoramento de Filas (Bull Board)

Com o servidor rodando e o Redis ativo, você pode monitorar todas as filas de processamento assíncrono (PDFs, e-mails, pagamentos) acessando no navegador:

👉 **`http://localhost:3000/admin/queues`**

---

## 📄 Licença

Este projeto é distribuído sob a licença **ISC**. Consulte o arquivo `LICENSE` para obter mais detalhes.

---

<div align="center">
  <sub>Desenvolvido com foco em alta performance, segurança e experiência em tempo real pelo time <strong>plusTicket</strong>.</sub>
</div>
