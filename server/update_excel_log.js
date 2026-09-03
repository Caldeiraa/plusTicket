const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function generateUpdatedExcel() {
  const wb = XLSX.utils.book_new();

  // 1. ABA: LOG DE ATIVIDADES E REUNIÕES
  const activitiesData = [
    [
      'ID',
      'Data',
      'Etapa / Tipo',
      'Título da Atividade',
      'Descrição Detalhada do que foi Feito / Discutido',
      'Participantes',
      'Duração (Horas)',
      'Status / Entregável'
    ],
    [
      'LOG-01',
      '01/08/2026',
      'Reunião com Orientador',
      'Alinhamento Inicial e Definição do Tema',
      'Apresentação da proposta de desenvolvimento individual para a disciplina de Projeto Integrador II. Definição do tema: "plusTicket - Plataforma de Gestão de Eventos, Ingressos com QR Code e Check-in em Tempo Real". Validação da autorização para execução solo com o professor orientador.',
      'Aluno (Eu) e Professor Orientador',
      2.0,
      'Tema aprovado pelo Orientador'
    ],
    [
      'LOG-02',
      '05/08/2026',
      'Brainstorming / Pesquisa',
      'Levantamento de Problema e Público-Alvo',
      'Mapeamento das principais dores no setor de eventos (filas na portaria, fraudes de ingressos clonados, lentidão em abertura de vendas e burocracia de reembolsos). Identificação dos stakeholders: Participantes, Produtores/Organizadores e Equipe de Portaria (Staff).',
      'Aluno (Individual)',
      3.0,
      'Documento de problematização e personas'
    ],
    [
      'LOG-03',
      '10/08/2026',
      'Sessão de Planejamento',
      'Definição das Regras de Negócio Iniciais',
      'Estruturação das regras de negócio centrais: controle de estoque concorrente por lote, geração de UUID + hash criptográfico para QR Code único, bloqueio instantâneo de duplicidade de ingresso na portaria (anti-fraude), e política de devoluções (100% de reembolso até 7 dias pelo CDC, 50% após 7 dias).',
      'Aluno (Individual)',
      4.0,
      'Matriz de regras de negócio preliminares'
    ],
    [
      'LOG-04',
      '15/08/2026',
      'Pesquisa Técnica',
      'Definição da Stack Tecnológica e Arquitetura',
      'Pesquisa e seleção da stack do projeto: Frontend em React 18 + Tailwind CSS, Backend em Node.js com Express e Prisma ORM, Banco de dados relacional MariaDB/MySQL, WebSockets (Socket.IO) para portaria ao vivo e filas assíncronas (Redis + BullMQ) para geração de PDFs e envio de e-mails.',
      'Aluno (Individual)',
      3.5,
      'Definição da arquitetura e ferramentas'
    ],
    [
      'LOG-05',
      '20/08/2026',
      'Reunião com Orientador',
      'Validação de Escopo e Regras de Negócio',
      'Apresentação do escopo do sistema e das regras de negócio mapeadas para o professor orientador. Recebimento de feedbacks sobre a viabilidade das entregas e orientação para detalhamento formal dos requisitos.',
      'Aluno (Eu) e Professor Orientador',
      1.5,
      'Escopo validado pelo Orientador'
    ],
    [
      'LOG-06',
      '25/08/2026',
      'Engenharia de Requisitos',
      'Levantamento de Requisitos Funcionais e Não-Funcionais',
      'Redação e priorização dos requisitos funcionais (RF01 a RF14: autenticação JWT, CRUD de eventos, carrinho, emissão de ingressos, scanner com câmera, devoluções, etc.) e requisitos não-funcionais (tempo de resposta na portaria <800ms, segurança bcrypt, concorrência).',
      'Aluno (Individual)',
      4.0,
      'Backlog inicial de requisitos (MoSCoW)'
    ],
    [
      'LOG-07',
      '29/08/2026',
      'Modelagem Conceitual',
      'Esboço do Modelo de Dados Relacional',
      'Mapeamento inicial das entidades e relacionamentos do banco: User (com RBAC), Event, TicketType (lotes), Order, Ticket, CheckIn e Refund. Desenho preliminar do fluxo de dados e endpoints da API REST.',
      'Aluno (Individual)',
      3.5,
      'Diagrama conceitual e esquema de entidades'
    ],
    [
      'LOG-08',
      '02/09/2026',
      'Planejamento de Sprints',
      'Fechamento do Registro Inicial e Planejamento da Sprint 1',
      'Consolidação das horas e registros de atividades da Sprint 0. Preparação para implementação dos diferenciais de mercado.',
      'Aluno (Individual)',
      2.0,
      'Log de atividades consolidado'
    ],
    [
      'LOG-09',
      '03/09/2026',
      'Desenvolvimento / Segurança',
      'Implementação do Módulo de Auditoria (AuditLog) e Anti-Fraude',
      'Criação da tabela audit_logs no banco com índices de performance. Implementação do AuditLogService capturando compras, check-ins, reembolsos, transferências e tentativas de reutilização indevida de ingressos com severidade CRITICAL. Endpoints para monitoramento do ADMIN.',
      'Aluno (Individual)',
      3.5,
      'Módulo AuditLog integrado e funcional'
    ],
    [
      'LOG-10',
      '03/09/2026',
      'Desenvolvimento / Analytics',
      'Analytics Avançado, Análise por Portão e Inteligência de Vendas',
      'Desenvolvimento dos endpoints de telemetria: vendas por período (30 dias), taxa de conversão, vendas por hora, distribuição de entradas por portão (gate) e motor de regras de inteligência de vendas com 10 insights automáticos sem dependência de IA externa.',
      'Aluno (Individual)',
      3.0,
      'Endpoints de Analytics e Insights integrados'
    ],
    [
      'LOG-11',
      '03/09/2026',
      'Desenvolvimento / Portaria',
      'Sistema de Check-in Offline com Sincronização Local e em Lote',
      'Criação da rota para download do pacote de ingressos do evento para o navegador. Implementação de validação offline com cache local no scanner, prevenção imediata de duplicidade mesmo sem internet e sincronização com reconciliação no retorno da conexão.',
      'Aluno (Individual)',
      3.5,
      'Check-in offline completo no backend e frontend'
    ],
    [
      'LOG-12',
      '03/09/2026',
      'Desenvolvimento / Frontend',
      'Ingresso Digital Moderno e Conformidade LGPD',
      'Redesenho da carteira digital no frontend no estilo Apple Wallet com entalhes de bilhete, selo dinâmico "✓ Check-in Realizado" com data/hora e linha do tempo do ciclo de vida do ingresso. Implementação de exportação de dados pessoais e desativação de conta (LGPD).',
      'Aluno (Individual)',
      3.0,
      'Passe digital moderno e endpoints LGPD'
    ]
  ];

  const wsActivities = XLSX.utils.aoa_to_sheet(activitiesData);
  wsActivities['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 45 },
    { wch: 80 },
    { wch: 35 },
    { wch: 16 },
    { wch: 45 }
  ];

  // 2. ABA: RESUMO E CONSOLIDAÇÃO
  const summaryData = [
    ['PROJETO INTEGRADOR II - RESUMO EXECUTIVO DE ATIVIDADES'],
    ['Aluno:', '[Seu Nome Completo] (Execução Individual Autorizada)'],
    ['Tema do Projeto:', 'plusTicket - Plataforma de Gestão de Eventos e Check-in em Tempo Real'],
    ['Orientador:', '[Nome do Professor Orientador]'],
    ['Data do Relatório:', '03/09/2026'],
    [''],
    ['Métrica', 'Valor Consolidado'],
    ['Total de Sessões / Atividades Realizadas:', 12],
    ['Total de Horas Dedicadas até o Momento:', '36.5 horas'],
    ['Reuniões de Alinhamento com Orientador:', '2 reuniões (3.5h)'],
    ['Sessões de Desenvolvimento & Planejamento:', '10 sessões (33.0h)'],
    ['Diferenciais de Mercado Implementados:', 'AuditLog, Check-in Offline, Insights de Vendas, Wallet Digital, LGPD'],
    ['Status Geral do Projeto:', 'Sprint 0 (Concluída) | Sprint 1 & Diferenciais (Concluídos e Testados)'],
    ['Ambiente de Testes:', '100% Localhost (Custo R$ 0,00)']
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 40 },
    { wch: 60 }
  ];

  // 3. ABA: STATUS DAS FUNCIONALIDADES E DIFERENCIAIS
  const featuresData = [
    ['Módulo / Funcionalidade', 'Tipo', 'Descrição da Implementação', 'Status', 'Diferencial de Mercado'],
    ['AuditLog (Auditoria Central)', 'Segurança', 'Tabela audit_logs com severidades (INFO, WARNING, CRITICAL) e captura de IP/UserAgent', 'CONCLUÍDO', 'Alta rastreabilidade'],
    ['Detecção Anti-Fraude', 'Segurança', 'Alertas de tentativas de validação duplicada de QR Code e painel para ADMIN', 'CONCLUÍDO', 'Proteção de portaria'],
    ['Check-in Offline com Cache', 'Operação', 'Download de pacote de ingressos para localStorage e validação autônoma sem internet', 'CONCLUÍDO', 'Contingência total de rede'],
    ['Sincronização em Lote', 'Operação', 'Reconciliação automática de check-ins offline com detecção de concorrência', 'CONCLUÍDO', 'Integridade de acesso'],
    ['Analytics Expandido', 'Gestão', 'Vendas por período (30d), taxa de conversão e fluxo de vendas por hora', 'CONCLUÍDO', 'Visão executiva'],
    ['Análise por Portão (Gates)', 'Gestão', 'Distribuição de público por portão/staff com primeiro e último check-in', 'CONCLUÍDO', 'Logística de portaria'],
    ['Inteligência de Vendas', 'Inovação', 'Motor de regras SQL que gera 10 tipos de alertas e recomendações de lotes', 'CONCLUÍDO', 'Tomada de decisão rápida'],
    ['Ingresso Digital Apple Wallet', 'UX / Mobile', 'Passe digital responsivo com selo "✓ Check-in Realizado" e timeline completa', 'CONCLUÍDO', 'Experiência premium'],
    ['Conformidade LGPD', 'Privacidade', 'Exportação completa de dados do usuário em JSON e exclusão/desativação de conta', 'CONCLUÍDO', 'Adequação legal'],
    ['Reembolso Automático CDC', 'Comercial', '100% até 7 dias da compra e 50% após o prazo legal', 'CONCLUÍDO', 'Regras comerciais reais'],
    ['Transferência de Titularidade', 'Comercial', 'Limite de 2 trocas, validade de 30 minutos e novo QR Code gerado', 'CONCLUÍDO', 'Segurança anti-cambismo']
  ];

  const wsFeatures = XLSX.utils.aoa_to_sheet(featuresData);
  wsFeatures['!cols'] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 65 },
    { wch: 14 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, wsActivities, 'Log de Atividades');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');
  XLSX.utils.book_append_sheet(wb, wsFeatures, 'Diferenciais de Mercado');

  const outputPath = path.resolve('c:/Users/Daten/Desktop/plusTicket', 'LOG_DE_ATIVIDADES_E_REUNIOES_PI2_ATUALIZADO.xlsx');
  XLSX.writeFile(wb, outputPath);
  console.log('Planilha Excel atualizada com sucesso em:', outputPath);
}


generateUpdatedExcel();
