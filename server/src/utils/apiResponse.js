/**
 * Helpers para respostas padronizadas da API
 */

class ApiResponse {
  /**
   * Resposta de sucesso
   */
  static success(res, data = null, message = 'Operação realizada com sucesso', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resposta de criação
   */
  static created(res, data = null, message = 'Recurso criado com sucesso') {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Resposta paginada
   */
  static paginated(res, data, pagination, message = 'Dados recuperados com sucesso') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resposta de erro
   */
  static error(res, message = 'Erro interno do servidor', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  /**
   * Not Found
   */
  static notFound(res, message = 'Recurso não encontrado') {
    return ApiResponse.error(res, message, 404);
  }

  /**
   * Unauthorized
   */
  static unauthorized(res, message = 'Não autorizado') {
    return ApiResponse.error(res, message, 401);
  }

  /**
   * Forbidden
   */
  static forbidden(res, message = 'Acesso negado') {
    return ApiResponse.error(res, message, 403);
  }

  /**
   * Bad Request
   */
  static badRequest(res, message = 'Requisição inválida', errors = null) {
    return ApiResponse.error(res, message, 400, errors);
  }
}

module.exports = ApiResponse;
