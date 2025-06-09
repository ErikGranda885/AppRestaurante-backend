import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { EnviarEmailDto } from './dto/email.dto';

@Injectable()
export class MailService {
  private oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground',
  );

  constructor() {
    this.oAuth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
  }

  async sendEmail(dto: EnviarEmailDto) {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    const rawMessage = this.createRawEmail(
      dto.recipients,
      dto.subject,
      dto.html,
    );

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });

    return res.data;
  }

  private createRawEmail(to: string, subject: string, html: string): string {
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      html,
    ];
    const message = messageParts.join('\n');
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async enviarCorreoRecuperacion(email: string, token: string) {
    const resetLink = `${process.env.FRONTEND_URL}/nuevaClave?token=${token}`;

    const subject = 'Restablecimiento de contraseña - Shawarma La Estación';
    const html = `
    <p>Hola,</p>
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p>Haz clic en el siguiente enlace para crear una nueva:</p>
    <a href="${resetLink}">Restablecer contraseña</a>
    <p>Si no solicitaste esto, puedes ignorar este mensaje.</p>
  `;

    const dto: EnviarEmailDto = {
      recipients: email,
      subject,
      html,
    };

    return await this.sendEmail(dto);
  }
}
