// Allow underscore-dangle so we can add our own retryCount prop to axios request and avoid possible naming collision
/* eslint-disable no-underscore-dangle */
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';
import {
  TokenCredential,
  ChainedTokenCredential,
  ManagedIdentityCredential,
  ClientSecretCredential,
} from '@dvsa/ftts-auth-client';

import { config } from '../../config';
import { Logger } from '../../libraries/logger';
import { SARASBookingDetails, SARASAxiosError } from '../../interfaces/saras';

const delay = (seconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const {
  azureTenantId, azureClientId, azureClientSecret, userAssignedEntityClientId,
} = config.saras.identity;

const sources: TokenCredential[] = [new ManagedIdentityCredential(userAssignedEntityClientId)];
if (azureTenantId && azureClientId && azureClientSecret) {
  sources.push(new ClientSecretCredential(azureTenantId, azureClientId, azureClientSecret));
}
const sarasToken: TokenCredential = new ChainedTokenCredential(...sources);

class SarasAxios {
  token: string;

  instance: AxiosInstance;

  logger: Logger;

  constructor(token: string, logger: Logger) {
    this.instance = axios.create();
    this.logger = logger;
    this.token = token;
    this.setupInterceptors();
  }

  private parseRetryAfter(header: string | undefined): number {
    if (header) {
      // Header value may be a string containing number of seconds
      const value = parseFloat(header);
      if (!Number.isNaN(value)) {
        return value;
      }
      // Or a date in http date string format
      const date = dayjs(header);
      if (date.isValid()) {
        const now = dayjs();
        const secondsFromNow = date.diff(now, 'second');
        return secondsFromNow;
      }
    }
    return 10; // Default if missing/invalid
  }

  private setupInterceptors(): void {
    // Pre-request auth headers
    this.instance.interceptors.request.use(
      (req: AxiosRequestConfig) => {
        req.headers = { ...req.headers, Authorization: `Bearer ${this.token}` };
        return req;
      },
      (err: AxiosError) => err,
    );

    // Post-response retry handling
    this.instance.interceptors.response.use(
      (res) => res,
      async (err: SARASAxiosError) => {
        if (err.config && err.response?.status === 429) {
          this.logger.critical('429 error calling SARAS');
          err.config._retryCount = err.config._retryCount ?? 0;
          if (err.config._retryCount < config.saras.maxRetries) {
            const retryAfter = this.parseRetryAfter(err.response.headers?.['retry-after']);
            this.logger.warn(`Retrying failed SARAS request after ${retryAfter} seconds`);
            await delay(retryAfter);
            err.config._retryCount++;
            return this.instance.request(err.config); // Retry request
          }
          this.logger.warn(`Reached max ${config.saras.maxRetries} retries of failed SARAS request`);
        }
        throw err;
      },
    );
  }

  async delete(url: string): Promise<void> {
    await this.instance.delete(url);
  }

  async post(url: string, payload: SARASBookingDetails): Promise<void> {
    await this.instance.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async put(url: string, payload: SARASBookingDetails): Promise<void> {
    await this.instance.put(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export {
  sarasToken,
  SarasAxios,
};
