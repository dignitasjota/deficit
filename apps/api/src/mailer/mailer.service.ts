import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Servicio de envío de emails. Provider-agnostic via SMTP.
 * - Dev: apunta a `mailpit` del docker-compose (no envía nada real,
 *   captura todo en su UI en http://localhost:8025).
 * - Prod: configurar SMTP_HOST/PORT/USER/PASS con Resend SMTP, SES,
 *   postal self-hosted, etc.
 *
 * En tests reales no queremos hablar a SMTP. El método `setMockSink`
 * permite registrar un buffer en memoria y desactivar el transporter,
 * de modo que los tests puedan inspeccionar los mensajes enviados sin
 * depender de servicios externos.
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private mockSink: MailMessage[] | null = null;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    if (this.mockSink) return;
    const smtp = this.config.smtp;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? '' } : undefined,
    });
  }

  /**
   * En tests: registra un buffer y desactiva el transporter SMTP. Los
   * mensajes enviados se acumulan en el array para inspección.
   */
  setMockSink(sink: MailMessage[] | null): void {
    this.mockSink = sink;
    if (sink) this.transporter = null;
  }

  async send(msg: MailMessage): Promise<void> {
    if (this.mockSink) {
      this.mockSink.push(msg);
      return;
    }

    if (!this.transporter) {
      this.logger.warn(`Transporter no inicializado, omitiendo envío a ${msg.to}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.smtp.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      this.logger.log(`Email enviado a ${msg.to}: ${msg.subject}`);
    } catch (err) {
      // No queremos que un fallo de SMTP rompa /register o
      // /request-password-reset (si lo hace, atacante descubre cuentas
      // por timing/error). Logueamos y devolvemos OK al caller.
      this.logger.error(`Fallo enviando email a ${msg.to}`, err as Error);
    }
  }
}
