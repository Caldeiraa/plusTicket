const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ============================================
  // 1. CRIAR USUÁRIOS
  // ============================================

  const adminPassword = await bcrypt.hash('admin123', 12);
  const organizerPassword = await bcrypt.hash('organizer123', 12);
  const attendeePassword = await bcrypt.hash('attendee123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@plusticket.com' },
    update: {},
    create: {
      name: 'Admin plusTicket',
      email: 'admin@plusticket.com',
      password: adminPassword,
      role: 'ADMIN',
      phone: '(11) 99999-0000',
    },
  });
  console.log(`✅ Admin criado: ${admin.email}`);

  const organizer = await prisma.user.upsert({
    where: { email: 'organizador@plusticket.com' },
    update: {},
    create: {
      name: 'Carlos Organizador',
      email: 'organizador@plusticket.com',
      password: organizerPassword,
      role: 'ORGANIZER',
      phone: '(11) 98888-1111',
    },
  });
  console.log(`✅ Organizador criado: ${organizer.email}`);

  const attendee = await prisma.user.upsert({
    where: { email: 'participante@email.com' },
    update: {},
    create: {
      name: 'Maria Participante',
      email: 'participante@email.com',
      password: attendeePassword,
      role: 'ATTENDEE',
      phone: '(21) 97777-2222',
    },
  });
  console.log(`✅ Participante criado: ${attendee.email}`);

  // ============================================
  // 2. CRIAR EVENTOS
  // ============================================

  const event1 = await prisma.event.upsert({
    where: { slug: 'tech-summit-2026' },
    update: {},
    create: {
      title: 'Tech Summit 2026',
      slug: 'tech-summit-2026',
      description: 'O maior evento de tecnologia do Brasil! Palestras com profissionais renomados, workshops práticos e networking com a comunidade tech. Três dias de imersão total no futuro da tecnologia.',
      shortDesc: 'O maior evento de tecnologia do Brasil com palestras, workshops e networking.',
      venue: 'São Paulo Expo',
      address: 'Rod. dos Imigrantes, km 1,5 - Vila Água Funda',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '04329-900',
      date: new Date('2026-10-15T09:00:00'),
      endDate: new Date('2026-10-17T22:00:00'),
      doorsOpen: new Date('2026-10-15T08:00:00'),
      capacity: 5000,
      status: 'PUBLISHED',
      organizerId: organizer.id,
    },
  });
  console.log(`✅ Evento criado: ${event1.title}`);

  const event2 = await prisma.event.upsert({
    where: { slug: 'festival-rock-rj-2026' },
    update: {},
    create: {
      title: 'Festival Rock RJ 2026',
      slug: 'festival-rock-rj-2026',
      description: 'Uma noite inesquecível com as melhores bandas de rock do Brasil! Shows ao vivo, praça de alimentação gourmet e área VIP exclusiva.',
      shortDesc: 'Festival de rock com as melhores bandas, shows ao vivo e área VIP.',
      venue: 'Jeunesse Arena',
      address: 'Av. Embaixador Abelardo Bueno, 3401 - Barra da Tijuca',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22775-040',
      date: new Date('2026-11-20T18:00:00'),
      endDate: new Date('2026-11-20T23:59:00'),
      doorsOpen: new Date('2026-11-20T17:00:00'),
      capacity: 15000,
      status: 'PUBLISHED',
      organizerId: organizer.id,
    },
  });
  console.log(`✅ Evento criado: ${event2.title}`);

  const event3 = await prisma.event.upsert({
    where: { slug: 'workshop-ia-2026' },
    update: {},
    create: {
      title: 'Workshop de Inteligência Artificial',
      slug: 'workshop-ia-2026',
      description: 'Workshop intensivo de 1 dia sobre IA generativa, LLMs e aplicações práticas. Traga seu notebook e aprenda na prática!',
      shortDesc: 'Workshop intensivo sobre IA generativa e LLMs.',
      venue: 'Hub de Inovação FIAP',
      address: 'Av. Lins de Vasconcelos, 1264 - Aclimação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01538-001',
      date: new Date('2026-09-05T09:00:00'),
      endDate: new Date('2026-09-05T18:00:00'),
      doorsOpen: new Date('2026-09-05T08:30:00'),
      capacity: 200,
      status: 'DRAFT',
      organizerId: organizer.id,
    },
  });
  console.log(`✅ Evento criado: ${event3.title} (DRAFT)`);

  // ============================================
  // 3. CRIAR TIPOS DE INGRESSO
  // ============================================

  // Tech Summit
  await prisma.ticketType.createMany({
    data: [
      {
        name: 'Pista',
        description: 'Acesso geral ao evento com todas as palestras e workshops.',
        price: 150.00,
        quantity: 3000,
        sold: 0,
        maxPerUser: 5,
        eventId: event1.id,
      },
      {
        name: 'VIP',
        description: 'Acesso VIP com assentos reservados, coffee break premium e kit exclusivo.',
        price: 450.00,
        quantity: 1500,
        sold: 0,
        maxPerUser: 3,
        eventId: event1.id,
      },
      {
        name: 'Camarote Premium',
        description: 'Experiência completa: lounge exclusivo, open bar, meet & greet com palestrantes.',
        price: 1200.00,
        quantity: 500,
        sold: 0,
        maxPerUser: 2,
        eventId: event1.id,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Tipos de ingresso criados para Tech Summit');

  // Festival Rock
  await prisma.ticketType.createMany({
    data: [
      {
        name: 'Pista',
        description: 'Acesso geral ao festival.',
        price: 180.00,
        quantity: 10000,
        sold: 0,
        maxPerUser: 6,
        eventId: event2.id,
      },
      {
        name: 'Front Stage',
        description: 'Área exclusiva próxima ao palco.',
        price: 350.00,
        quantity: 3000,
        sold: 0,
        maxPerUser: 4,
        eventId: event2.id,
      },
      {
        name: 'Camarote VIP',
        description: 'Visão privilegiada, open bar e canapés.',
        price: 800.00,
        quantity: 2000,
        sold: 0,
        maxPerUser: 4,
        eventId: event2.id,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Tipos de ingresso criados para Festival Rock RJ');

  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('📋 Credenciais de acesso:');
  console.log('   Admin:        admin@plusticket.com / admin123');
  console.log('   Organizador:  organizador@plusticket.com / organizer123');
  console.log('   Participante: participante@email.com / attendee123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
