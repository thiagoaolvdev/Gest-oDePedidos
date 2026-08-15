const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: process.env.MAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const sendMail = async ({ to, subject, html }) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('[EMAIL] Configuração de email não definida. Email não enviado.');
    return { messageId: 'mock' };
  }
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.MAIL_FROM || 'noreply@chemarauto.com.br'}>`,
      to,
      subject,
      html
    });
    console.log(`[EMAIL] Enviado para ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar:', error.message);
    return null;
  }
};

module.exports = { sendMail };
