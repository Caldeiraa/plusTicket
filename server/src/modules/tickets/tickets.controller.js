const ticketsService = require('./tickets.service');
const ApiResponse = require('../../utils/apiResponse');

class TicketsController {
  async createTicketType(req, res, next) {
    try {
      const ticketType = await ticketsService.createTicketType(
        req.params.eventId,
        req.body,
        req.user.id
      );
      return ApiResponse.created(res, ticketType, 'Tipo de ingresso criado');
    } catch (error) {
      next(error);
    }
  }

  async getTicketTypes(req, res, next) {
    try {
      const types = await ticketsService.getTicketTypes(req.params.eventId);
      return ApiResponse.success(res, types);
    } catch (error) {
      next(error);
    }
  }

  async purchase(req, res, next) {
    try {
      console.log("📦 PAYLOAD RECEBIDO:", req.body);
      const result = await ticketsService.purchaseTickets(req.body, req.user.id);
      return ApiResponse.created(res, result, 'Pedido criado com sucesso');
    } catch (error) {
      console.error("🔥 ERRO VERDADEIRO QUE ESTAVA ESCONDIDO:", error); // Isso vai revelar o mistério
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const ticket = await ticketsService.getTicketById(req.params.id, req.user.id);
      return ApiResponse.success(res, ticket);
    } catch (error) {
      next(error);
    }
  }

  async downloadPDF(req, res, next) {
    try {
      const { pdfBuffer, filename } = await ticketsService.getTicketPDF(req.params.id, req.user.id);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  async getMyTickets(req, res, next) {
    try {
      const { tickets, total, page, limit } = await ticketsService.getMyTickets(req.user.id, req.query);
      return ApiResponse.paginated(res, tickets, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async initiateTransfer(req, res, next) {
    try {
      const { targetEmail } = req.body;
      const transfer = await ticketsService.initiateTransfer(req.params.id, targetEmail, req.user.id);
      return ApiResponse.created(res, transfer, 'Transferência iniciada! O destinatário tem 30 minutos para confirmar.');
    } catch (error) {
      next(error);
    }
  }

  async acceptTransfer(req, res, next) {
    try {
      const result = await ticketsService.acceptTransfer(req.params.id, req.user.id);
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async cancelTransfer(req, res, next) {
    try {
      const result = await ticketsService.cancelTransfer(req.params.id, req.user.id);
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async getPendingTransfers(req, res, next) {
    try {
      const transfers = await ticketsService.getPendingTransfers(req.user.id);
      return ApiResponse.success(res, transfers);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketsController();
