const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');

class AuthService {
  /**
   * Registrar novo usuário
   */
  async register({ name, email, password, role, phone }) {
    // Verificar se e-mail já existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw Object.assign(new Error('Este e-mail já está cadastrado'), { statusCode: 409 });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'ATTENDEE',
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });

    // Gerar tokens
    const tokens = this.generateTokens(user.id);

    logger.info(`Novo usuário registrado: ${email} (${role || 'ATTENDEE'})`);

    return { user, ...tokens };
  }

  /**
   * Login
   */
  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
    }

    if (!user.isActive) {
      throw Object.assign(new Error('Conta desativada'), { statusCode: 403 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
    }

    const tokens = this.generateTokens(user.id);

    logger.info(`Login: ${email}`);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      ...tokens,
    };
  }

  /**
   * Obter perfil do usuário
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            organizedEvents: true,
            tickets: true,
            orders: true,
          },
        },
      },
    });

    if (!user) {
      throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
    }

    return user;
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw Object.assign(new Error('Token inválido'), { statusCode: 401 });
      }

      return this.generateTokens(user.id);
    } catch (error) {
      throw Object.assign(new Error('Refresh token inválido ou expirado'), { statusCode: 401 });
    }
  }

  /**
   * Gerar par de tokens (access + refresh)
   */
  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    return { token: accessToken, accessToken, refreshToken };
  }

  /**
   * LGPD - Exportar todos os dados pessoais do usuário
   */
  async exportUserData(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        orders: {
          select: {
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        tickets: {
          select: {
            code: true,
            status: true,
            holderName: true,
            createdAt: true,
            event: { select: { title: true, date: true, venue: true } },
          },
        },
        refunds: {
          select: {
            status: true,
            refundPercent: true,
            refundAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
    }

    return {
      title: 'Relatório de Dados Pessoais (LGPD - Lei 13.709/2018)',
      exportedAt: new Date().toISOString(),
      user,
    };
  }

  /**
   * LGPD - Solicitar desativação/exclusão de conta
   */
  async requestAccountDeletion(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
    }

    // Soft delete para preservação de histórico fiscal de compras
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    const auditLog = require('../auditlog/auditlog.service');
    auditLog.log({
      action: 'ACCOUNT_DELETE',
      entityType: 'USER',
      entityId: userId,
      userId,
      userName: user.name,
      details: `Conta desativada a pedido do usuário (LGPD): ${user.email}`,
      severity: 'WARNING',
    });

    return { success: true, message: 'Conta desativada e dados anonimizados com sucesso.' };
  }
}

module.exports = new AuthService();

