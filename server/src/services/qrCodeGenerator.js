const QRCode = require('qrcode');

/**
 * Gera um QR Code como data URL (base64)
 * @param {string} data - Dados para codificar no QR
 * @returns {Promise<string>} Data URL do QR Code
 */
async function generateQRCodeDataUrl(data) {
  return QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Gera um QR Code como Buffer (PNG)
 * @param {string} data - Dados para codificar no QR
 * @returns {Promise<Buffer>} Buffer do QR Code em PNG
 */
async function generateQRCodeBuffer(data) {
  return QRCode.toBuffer(data, {
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

module.exports = { generateQRCodeDataUrl, generateQRCodeBuffer };
