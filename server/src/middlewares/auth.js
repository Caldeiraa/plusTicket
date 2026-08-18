const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/apiResponse');
const { prisma } = require('../config/database');

/**
 * Middleware de autenticação JWT
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Token de acesso não fornecido');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return ApiResponse.unauthorized(res, 'Usuário não encontrado');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Conta desativada');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, 'Token inválido');
    }
    return ApiResponse.error(res, 'Erro na autenticação');
  }
}

/**
 * Middleware opcional - não bloqueia se não houver token
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch {
    // Ignora erros - autenticação é opcional
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
