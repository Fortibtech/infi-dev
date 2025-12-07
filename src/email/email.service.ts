import { Injectable, Logger } from '@nestjs/common';
import { ResendService } from '../resend/resend.service';
import { ConfigService } from '@nestjs/config';
import { RelationType } from '../referrals/enums/relation-type.enum';
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
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vérification d'email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; max-width: 600px; margin: 20px auto; background-color: #ffffff;">
              <!-- Header Text -->
              <tr>
                <td style="text-align: center; padding: 20px 0 10px 0; font-size: 16px; margin: 0; color: #333333;">
                  Vérification de votre adresse email
                </td>
              </tr>
              <!-- Main Content Box -->
              <tr>
                <td align="center">
                  <div style="background-color: #e7f0fe; border-radius: 15px; padding: 30px; margin: 20px; text-align: center;">
                    <h1 style="font-size: 24px; color: #333333; margin: 0 0 15px 0; font-weight: bold;">Bonjour ${firstName || 'utilisateur'},</h1>
                    <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">Merci de vous être inscrit. Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
                    <div style="text-align: center; margin: 20px 0;">
                      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 35px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #e5534b; text-decoration: none; border-radius: 25px; margin: 0 10px;">Vérifier mon email</a>
                    </div>
                    <p style="font-size: 16px; color: #333333; margin: 20px 0 0 0;">Ce lien expirera dans 24 heures.</p>
                    <p style="font-size: 16px; color: #333333; margin: 20px 0 0 0;">Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="text-align: center; padding: 20px 40px; font-size: 12px; color: #888888; line-height: 1.5;">
                  Plongez dans l'infini des possibilités. L'avenir du travail commence ici !
                  <hr style="border: 0; border-top: 1px solid #dddddd; margin: 15px 0;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px;">
                    <tr>
                      <td align="center">
                        <img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/infiny.png" alt="Infiny Logo" width="150" style="display: block; margin: 0 auto;">
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        `,
      });

      this.logger.log(`Email sent: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendRefusalInvitationEmail(email: string, name: string): Promise<void> {
    this.logger.log(
      `Sending refusal invitation email to ${email} for referrer ${name}`,
    );

    const subject = `${name} a refusé votre demande`;
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réponse à votre demande</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; max-width: 600px; margin: 20px auto; background-color: #ffffff;">
          <!-- Header Text -->
          <tr>
            <td style="text-align: center; padding: 20px 0 10px 0; font-size: 16px; margin: 0; color: #333333;">
             ${name} a repondu à votre demande
            </td>
          </tr>
          <!-- Main Content Box -->
          <tr>
            <td align="center">
              <div style="background-color: #e7f0fe; border-radius: 15px; padding: 30px; margin: 20px; text-align: center;">
                <h1 style="font-size: 24px; color: #333333; margin: 0 0 15px 0; font-weight: bold;">Dommage !</h1>
                <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">${name} a refusé votre demande de recommandation.</p>
                <img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/3364_4232.png" alt="Désolé" style="display: block; margin: 0 auto 30px auto; width: 100px;" />
                <div style="text-align: center; margin: 20px 0;">
                  <a href="[YOUR_APP_LINK_TO_NEW_REQUEST]" target="_blank" style="display: inline-block; padding: 12px 35px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #e5534b; text-decoration: none; border-radius: 25px; margin: 0 10px;">Nouvelle demande à un tiers</a>
                </div>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px 40px; font-size: 12px; color: #888888; line-height: 1.5;">
              Plongez dans l'infini des possibilités. L'avenir du travail commence ici !
              <hr style="border: 0; border-top: 1px solid #dddddd; margin: 15px 0;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0;">
                <tr>
                  <td align="center">
                    <a href="[LINKEDIN_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/linkedin.png" alt="LinkedIn" width="24" style="vertical-align: middle;"></a>
                    <a href="[INSTAGRAM_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/instagram.png" alt="Instagram" width="24" style="vertical-align: middle;"></a>
                    <a href="[X_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/x.png" alt="X" width="24" style="vertical-align: middle;"></a>
                    <a href="[FACEBOOK_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/facebook.png" alt="Facebook" width="24" style="vertical-align: middle;"></a>
                    <a href="[TIKTOK_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/tiktok.png" alt="TikTok" width="24" style="vertical-align: middle;"></a>
                    <a href="[YOUTUBE_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/youtube.png" alt="YouTube" width="24" style="vertical-align: middle;"></a>
                  </td>
                </tr>
              </table>
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px;">
                <tr>
                  <td align="center">
                    <img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/infiny.png" alt="Infiny Logo" width="150" style="display: block; margin: 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    try {
      const result = await this.resendService.send({
        from: 'noreply@infiny.fr',
        to: email,
        subject: subject,
        html: htmlContent,
      });

      this.logger.log(
        `Refusal invitation email sent: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send refusal invitation email to ${email}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendAcceptInvitationEmail(email: string, name: string): Promise<void> {
    this.logger.log(
      `Sending referral acceptance email to ${email} for referrer ${name}`,
    );

    const subject = `${name} a répondu à votre demande`;
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réponse à votre demande</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; max-width: 600px; margin: 20px auto; background-color: #ffffff;">
          <!-- Header Text -->
          <tr>
            <td style="text-align: center; padding: 20px 0 10px 0; font-size: 16px; margin: 0; color: #333333;">
             ${name} a répondu à votre demande
            </td>
          </tr>
          <!-- Main Content Box -->
          <tr>
            <td align="center">
              <div style="background-color: #e7f0fe; border-radius: 15px; padding: 30px; margin: 20px; text-align: center;">
                <h1 style="font-size: 24px; color: #333333; margin: 0 0 15px 0; font-weight: bold;">Bravo !</h1>
                <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">${name} a accepté votre demande de recommandation.</p>
                <img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/2815_1220.png" alt="Félicitations" style="display: block; margin: 0 auto 30px auto; width: 100px;" />
                <div style="text-align: center; margin: 20px 0;">
                  <a href="[YOUR_APP_LINK_HERE]" target="_blank" style="display: inline-block; padding: 12px 35px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #e5534b; text-decoration: none; border-radius: 25px; margin: 0 10px;">Compris</a>
                </div>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px 40px; font-size: 12px; color: #888888; line-height: 1.5;">
              Plongez dans l'infini des possibilités. L'avenir du travail commence ici !
              <hr style="border: 0; border-top: 1px solid #dddddd; margin: 15px 0;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0;">
                <tr>
                  <td align="center">
                    <a href="[LINKEDIN_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/linkedin.png" alt="LinkedIn" width="24" style="vertical-align: middle;"></a>
                    <a href="[INSTAGRAM_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/instagram.png" alt="Instagram" width="24" style="vertical-align: middle;"></a>
                    <a href="[X_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/x.png" alt="X" width="24" style="vertical-align: middle;"></a>
                    <a href="[FACEBOOK_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/facebook.png" alt="Facebook" width="24" style="vertical-align: middle;"></a>
                    <a href="[TIKTOK_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/tiktok.png" alt="TikTok" width="24" style="vertical-align: middle;"></a>
                    <a href="[YOUTUBE_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/youtube.png" alt="YouTube" width="24" style="vertical-align: middle;"></a>
                  </td>
                </tr>
              </table>
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px;">
                <tr>
                  <td align="center">
                    <img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/infiny.png" alt="Infiny Logo" width="150" style="display: block; margin: 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    try {
      const result = await this.resendService.send({
        from: 'noreply@infiny.fr',
        to: email,
        subject: subject,
        html: htmlContent,
      });
      // Optional: Log success or result details
      this.logger.log(
        `Acceptance email sent successfully to ${email}, Result: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      // Log the error
      this.logger.error(
        `Failed to send acceptance email to ${email}`,
        error.stack,
      );
      // Re-throw or handle the error as needed
      throw error;
    }
  }

  async sendReferralInvitationEmail(
    email: string,
    referrerName: string,
    requesterName: string,
    message: string,
    invitationLink: string,
    relationType: RelationType,
  ): Promise<void> {
    try {
      this.logger.log(
        `Sending referral invitation email to ${email} from ${requesterName}`,
      );

      const subject = `Peux-tu me recommander sur INFINY ?`;
      const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Demande de recommandation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff; color: #333333;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; max-width: 600px; margin: 20px auto; background-color: #ffffff;">
            <!-- Header Text -->
            <tr>
              <td style="text-align: center; padding: 20px 0 10px 0; font-size: 16px; margin: 0; color: #333333;">
                Demande de recommandation
              </td>
            </tr>
            <!-- Main Content Box -->
            <tr>
              <td align="center">
                <div style="background-color: #e7f0fe; border-radius: 15px; padding: 30px; margin: 20px; text-align: center;">
                  <h1 style="font-size: 24px; color: #333333; margin: 0 0 15px 0; font-weight: bold; text-align: left;">Bonjour ${referrerName || ''}</h1>
                  <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; text-align: left;">Peux-tu me recommander sur INFINY ?</p>
                  <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; text-align: left;">Je m'inscris sur INFINY, une plateforme de recrutement qui fonctionne grâce à la recommandation. Pour finaliser mon inscription, j'ai besoin que tu me recommandes en confirmant simplement que tu me connais dans un cadre professionnel ou personnel.</p>
                  <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; text-align: left;">Il/elle indique vous connaître dans un cadre : <strong>${relationType === RelationType.PROFESSIONAL ? 'Professionnel' : 'Personnel'}</strong>.</p>
                  <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; text-align: left;">Merci d'avance pour ton aide précieuse ! Évidemment, tu peux refuser si tu ne souhaites pas me recommander.</p>
                  <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; text-align: left;">Dans tous les cas, merci pour ton temps !</p>
                  <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; text-align: left;">À très vite,</p>
                  <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0; text-align: left;">${requesterName}</p>

                  ${
                    message
                      ? `
                  <div style="margin: 20px 0; padding: 15px; background-color: #d1e7ff; border-left: 4px solid #0d6efd; color: #333333; text-align: left;">
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Message de ${requesterName}:</strong></p>
                    <p style="margin: 5px 0; font-size: 14px; font-style: italic;">"${message}"</p>
                  </div>
                  `
                      : ''
                  }

                  <p style="font-size: 16px; color: #333333; margin: 20px 0 15px 0; text-align: left;">C'est rapide et ça se fait en un clic :</p>

                  <div style="display: flex; align-items: center; margin: 15px 0; text-align: left;">
                    <input type="checkbox" id="certification" checked style="margin-right: 10px;">
                    <label for="certification" style="font-size: 14px; margin: 0;">Je ne dois pas avoir de lien familial avec la personne que je recommande*</label>
                  </div>

                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${invitationLink}" style="display: inline-block; width: 200px; padding: 12px 0; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #e5534b; text-decoration: none; border-radius: 5px; text-align: center; margin: 0 10px;">Je recommande</a>
                    <a href="#" style="display: inline-block; width: 200px; padding: 12px 0; font-size: 16px; font-weight: bold; color: #e5534b; background-color: #ffffff; text-decoration: none; border-radius: 5px; border: 1px solid #e5534b; text-align: center; margin: 0 10px;">Je ne recommande pas</a>
                  </div>

                  <p style="font-size: 14px; color: #555; text-align: center; margin: 20px 0;">Ce lien expirera dans 48 heures.</p>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="text-align: center; padding: 20px 40px; font-size: 12px; color: #888888; line-height: 1.5;">
                Plongez dans l'infini des possibilités. L'avenir du travail commence ici !
                <hr style="border: 0; border-top: 1px solid #dddddd; margin: 15px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0;">
                  <tr>
                    <td align="center">
                      <a href="[LINKEDIN_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/linkedin.png" alt="LinkedIn" width="24" style="vertical-align: middle;"></a>
                      <a href="[INSTAGRAM_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/instagram.png" alt="Instagram" width="24" style="vertical-align: middle;"></a>
                      <a href="[X_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/x.png" alt="X" width="24" style="vertical-align: middle;"></a>
                      <a href="[FACEBOOK_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/facebook.png" alt="Facebook" width="24" style="vertical-align: middle;"></a>
                      <a href="[TIKTOK_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/tiktok.png" alt="TikTok" width="24" style="vertical-align: middle;"></a>
                      <a href="[YOUTUBE_URL]" target="_blank" style="display: inline-block; margin: 0 15px;"><img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/youtube.png" alt="YouTube" width="24" style="vertical-align: middle;"></a>
                    </td>
                  </tr>
                </table>
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px;">
                  <tr>
                    <td align="center">
                      <img src="https://emailpublicbucket.s3.eu-west-1.amazonaws.com/infiny.png" alt="Infiny Logo" width="150" style="display: block; margin: 0 auto;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>`;

      const result = await this.resendService.send({
        from: 'noreply@infiny.fr',
        to: email,
        subject: subject,
        html: htmlContent,
      });

      this.logger.log(
        `Referral invitation email sent: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send referral invitation email to ${email}: ${error.message}`,
      );
      throw error;
    }
  }
}
