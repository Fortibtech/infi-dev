import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CreateBatchOptions,
  CreateEmailOptions,
  CreateEmailRequestOptions,
  Resend,
} from 'resend';

import { ResendOptions } from './resend.interface';

@Injectable()
export class ResendService extends Resend {
  private readonly logger = new Logger(ResendService.name);

  constructor(
    @Inject('RESEND_CONFIGURATION')
    readonly options: ResendOptions,
  ) {
    if (!(options && options.apiKey)) {
      super('dummy_key');
      this.logger.error('Resend API key is missing');
      return;
    }

    super(options.apiKey);
    this.logger.log(
      `Initializing Resend with API key: ${options.apiKey.substring(0, 5)}...`,
    );
  }

  public send = async (
    payload: CreateEmailOptions,
    options?: CreateEmailRequestOptions,
  ) => {
    try {
      this.logger.log(`Sending email to ${payload.to}`);
      const result = await this.emails.send(payload, options);
      this.logger.log(`Email sent successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  };

  public sendBatch = async (
    payload: CreateBatchOptions,
    options?: CreateEmailRequestOptions,
  ) => {
    try {
      this.logger.log(`Sending batch emails`);
      const result = await this.batch.send(payload, options);
      this.logger.log(`Batch emails sent successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send batch emails: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  };
}
