import { apiRequest } from './client';

export const ticketsApi = {
  getTicketTypes: async (eventId) => {
    return await apiRequest(`/tickets/events/${eventId}/ticket-types`);
  },

  createTicketType: async (eventId, data) => {
    return await apiRequest(`/tickets/events/${eventId}/ticket-types`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  purchase: async (purchaseData) => {
    return await apiRequest('/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  getMyTickets: async () => {
    return await apiRequest('/tickets/my-tickets');
  },

  getById: async (id) => {
    return await apiRequest(`/tickets/${id}`);
  },

  getDownloadPdfUrl: (id) => {
    return `/api/tickets/${id}/pdf`;
  },

  // Transferências
  initiateTransfer: async (ticketId, targetEmail) => {
    return await apiRequest(`/tickets/${ticketId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ targetEmail }),
    });
  },

  acceptTransfer: async (transferId) => {
    return await apiRequest(`/tickets/transfers/${transferId}/accept`, {
      method: 'POST',
    });
  },

  cancelTransfer: async (transferId) => {
    return await apiRequest(`/tickets/transfers/${transferId}/cancel`, {
      method: 'POST',
    });
  },

  getPendingTransfers: async () => {
    return await apiRequest('/tickets/transfers/pending');
  },
};
