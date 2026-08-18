export const formatCurrency = (value) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatFullDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'PAID':
    case 'CONFIRMED':
    case 'PUBLISHED':
    case 'SUCCEEDED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'USED':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'PENDING':
    case 'PROCESSING':
    case 'DRAFT':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'CANCELLED':
    case 'FAILED':
    case 'REFUNDED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
};

export const translateStatus = (status) => {
  const map = {
    PAID: 'Pago',
    USED: 'Utilizado',
    PENDING: 'Pendente',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
    PUBLISHED: 'Publicado',
    DRAFT: 'Rascunho',
    COMPLETED: 'Concluído',
  };
  return map[status] || status;
};
