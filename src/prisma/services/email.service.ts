import { Injectable, Logger } from '@nestjs/common';
import { ResendService } from '../../resend/resend.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly resendService: ResendService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      const appUrl = this.configService.get<string>('APP_URL');
      this.logger.log(
        `Sending verification email to ${email} with token ${verificationToken}`,
      );
      this.logger.log(`Using app URL: ${appUrl}`);

      const verificationUrl = `${appUrl}/auth/verify?token=${verificationToken}`;

      // Utilisez un domaine valide ou l'adresse fournie par Resend
      const result = await this.resendService.send({
        from: 'noreply@infiny.fr', // Domaine par défaut fourni par Resend
        to: email,
        subject: 'Vérifiez votre adresse email',
        html: `
          <h1>Bonjour ${firstName || 'cher utilisateur'},</h1>
          <p>Merci de vous être inscrit sur notre plateforme. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
          <a href="${verificationUrl}">Vérifier mon email</a>
          <p>Ce lien expirera dans 24 heures.</p>
          <p>Si vous n'avez pas créé de compte, veuillez ignorer cet email.</p>
        `,
      });

      this.logger.log(
        `Email sent successfully, result: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
