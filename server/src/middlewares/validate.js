const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware de validação com Zod
 * @param {import('zod').ZodSchema} schema - Schema Zod para validar
 * @param {'body'|'query'|'params'} source - Fonte dos dados
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const errors = issues.map((e) => ({
        field: Array.isArray(e.path) ? e.path.join('.') : '',
        message: e.message,
      }));
      return ApiResponse.badRequest(res, 'Dados inválidos', errors);
    }

    // Substitui os dados originais pelos dados validados e transformados
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
