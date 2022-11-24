/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ChainedTokenCredential, ClientSecretCredential, ManagedIdentityCredential, TokenCredential } from '@dvsa/ftts-auth-client';
import DynamicsWebApi, { OnTokenAcquiredCallback } from 'dynamics-web-api';
import { config } from '../config';
import { logger } from './logger';

const sources: TokenCredential[] = [new ManagedIdentityCredential(config.crm.auth.userAssignedEntityClientId)];
if (config.crm.auth.tenantId && config.crm.auth.clientId && config.crm.auth.clientSecret) {
  sources.push(new ClientSecretCredential(config.crm.auth.tenantId, config.crm.auth.clientId, config.crm.auth.clientSecret));
}
export const chainedTokenCredential = new ChainedTokenCredential(...sources);

export async function onTokenRefresh(dynamicsWebApiCallback: OnTokenAcquiredCallback): Promise<void> {
  try {
    const accessToken = await chainedTokenCredential.getToken(config.crm.auth.scope);
    dynamicsWebApiCallback(accessToken?.token);
  } catch (error) {
    logger.error(error as Error, `dynamicsWebApi::onTokenRefresh: Failed to authenticate with CRM - ${(error as Error)?.message}`);
    // Callback needs to be called - to prevent function from hanging
    dynamicsWebApiCallback('');
  }
}

export function newDynamicsWebApi(): DynamicsWebApi {
  return new DynamicsWebApi({
    webApiUrl: config.crm.apiUrl,
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onTokenRefresh,
  });
}
