const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

/**
 * Inicializa o transporter de e-mail
 * Em dev: usa Ethereal (e-mail fake para testes)
 * Em prod: usa as credenciais SMTP configuradas
 */
async function initEmailTransporter() {
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    // Criar conta Ethereal para testes
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info(`✅ E-mail configurado (Ethereal): ${testAccount.user}`);
    logger.info(`📧 Visualizar e-mails em: https://ethereal.email/login`);
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    logger.info('✅ E-mail SMTP configurado');
  }

  return transporter;
}

/**
 * Retorna o transporter de e-mail
 */
function getTransporter() {
  if (!transporter) {
    throw new Error('Email transporter não inicializado. Chame initEmailTransporter() primeiro.');
  }
  return transporter;
}

/**
 * Envia um e-mail
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: process.env.SMTP_FROM || '"plusTicket" <noreply@plusticket.com>',
    to,
    subject,
    html,
    attachments,
  });

  // Em dev, logar URL para visualizar o e-mail
  if (process.env.NODE_ENV === 'development') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`📧 Preview do e-mail: ${previewUrl}`);
    }
  }

  return info;
}

module.exports = { initEmailTransporter, getTransporter, sendEmail };
