const PDFDocument = require('pdfkit');
const { generateQRCodeBuffer } = require('./qrCodeGenerator');
const path = require('path');
const fs = require('fs');

/**
 * Gera PDF do ingresso com QR Code
 * @param {object} ticket - Dados do ingresso
 * @returns {Promise<Buffer>} Buffer do PDF
 */
async function generateTicketPDF(ticket) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [420, 600],
        margin: 30,
        info: {
          Title: `Ingresso - ${ticket.event.title}`,
          Author: 'plusTicket',
          Subject: `Ingresso ${ticket.code}`,
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ====== HEADER ======
      // Fundo do header
      doc.rect(0, 0, 420, 100).fill('#1a1a2e');

      // Logo / Título da plataforma
      doc.fontSize(28).fillColor('#e94560').text('plus', 30, 25, { continued: true });
      doc.fillColor('#ffffff').text('Ticket');

      doc.fontSize(9).fillColor('#cccccc').text('Seu ingresso digital', 30, 60);
      doc.fontSize(8).fillColor('#888888').text(`Código: ${ticket.code}`, 30, 78);

      // ====== INFORMAÇÕES DO EVENTO ======
      doc.fillColor('#1a1a2e');

      doc.fontSize(18).text(ticket.event.title, 30, 120, { width: 360 });

      const infoY = doc.y + 15;

      // Local
      doc.fontSize(10).fillColor('#666666').text('📍 Local', 30, infoY);
      doc.fontSize(11).fillColor('#333333').text(ticket.event.venue, 30, infoY + 14, { width: 360 });
      doc.fontSize(9).fillColor('#888888').text(ticket.event.address, 30, doc.y + 2, { width: 360 });

      // Data
      const dateY = doc.y + 15;
      const eventDate = new Date(ticket.event.date);
      const dateStr = eventDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = eventDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.fontSize(10).fillColor('#666666').text('📅 Data e Hora', 30, dateY);
      doc.fontSize(11).fillColor('#333333').text(`${dateStr} às ${timeStr}`, 30, dateY + 14, { width: 360 });

      // Tipo de ingresso
      const typeY = doc.y + 15;
      doc.fontSize(10).fillColor('#666666').text('🎫 Ingresso', 30, typeY);
      doc.fontSize(13).fillColor('#e94560').text(ticket.ticketType.name, 30, typeY + 14);

      // Titular
      const holderY = doc.y + 15;
      doc.fontSize(10).fillColor('#666666').text('👤 Titular', 30, holderY);
      doc.fontSize(11).fillColor('#333333').text(ticket.holderName, 30, holderY + 14);
      doc.fontSize(9).fillColor('#888888').text(ticket.holderEmail, 30, doc.y + 2);

      // ====== SEPARADOR ======
      const sepY = doc.y + 20;
      // Linha tracejada
      doc.save();
      doc.strokeColor('#cccccc').lineWidth(1).dash(5, { space: 3 });
      doc.moveTo(30, sepY).lineTo(390, sepY).stroke();
      doc.restore();

      // ====== QR CODE ======
      const qrBuffer = await generateQRCodeBuffer(ticket.code);
      const qrY = sepY + 15;
      const qrSize = 140;
      const qrX = (420 - qrSize) / 2;

      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Texto abaixo do QR
      doc.fontSize(8).fillColor('#888888').text(
        'Apresente este QR Code na entrada do evento',
        30,
        qrY + qrSize + 10,
        { align: 'center', width: 360 }
      );

      // ====== FOOTER ======
      doc.fontSize(7).fillColor('#aaaaaa').text(
        'Este ingresso é pessoal e intransferível. plusTicket © 2026',
        30,
        565,
        { align: 'center', width: 360 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Salva o PDF no diretório de uploads
 * @param {Buffer} pdfBuffer - Buffer do PDF
 * @param {string} filename - Nome do arquivo
 * @returns {string} Caminho do arquivo salvo
 */
function savePDF(pdfBuffer, filename) {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, pdfBuffer);

  return filePath;
}

module.exports = { generateTicketPDF, savePDF };
