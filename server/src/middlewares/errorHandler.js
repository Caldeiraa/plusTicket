const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

/**
 * Error handler global do Express
 */
function errorHandler(err, req, res, _next) {
  logger.error('Erro não tratado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Erros do Prisma
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'campo';
    return ApiResponse.badRequest(res, `Já existe um registro com este ${field}`);
  }

  if (err.code === 'P2025') {
    return ApiResponse.notFound(res, 'Registro não encontrado');
  }

  // Erros do Zod (validação)
  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    const errors = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : '',
      message: e.message,
    }));
    return ApiResponse.badRequest(res, 'Dados inválidos', errors);
  }

  // Erro de JSON malformado
  if (err.type === 'entity.parse.failed') {
    return ApiResponse.badRequest(res, 'JSON inválido no corpo da requisição');
  }

  // Erro genérico
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : err.message;

  return ApiResponse.error(res, message, statusCode);
}

module.exports = errorHandler;
