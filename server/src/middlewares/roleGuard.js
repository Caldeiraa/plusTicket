const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware de controle de acesso por role
 * @param {...string} roles - Roles permitidas (ADMIN, ORGANIZER, ATTENDEE)
 */
function roleGuard(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Autenticação necessária');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Acesso restrito. Roles permitidas: ${roles.join(', ')}`
      );
    }

    next();
  };
}

module.exports = roleGuard;
