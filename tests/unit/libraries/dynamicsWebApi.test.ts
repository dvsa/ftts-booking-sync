import { ChainedTokenCredential } from '@dvsa/ftts-auth-client';
import { mockedConfig } from '../../stubs/config.mock';
import { mockedLogger } from '../../stubs/logger.mock';
import { onTokenRefresh } from '../../../src/libraries/dynamics-web-api';

jest.mock('../../../src/config');
jest.mock('../../../src/libraries/logger');

jest.mock('@dvsa/ftts-auth-client');
const mockedChainedTokenCredential = jest.mocked(ChainedTokenCredential, true);

describe('DynamicsWebApi', () => {

  describe('onTokenRefresh', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockedConfig.crm.auth.tenantId = 'TENANT_ID';
      mockedConfig.crm.apiUrl = 'CRM_AZURE_AD_URI';
      mockedConfig.crm.auth.clientId = 'CRM_CLIENT_ID';
      mockedConfig.crm.auth.clientSecret = 'CRM_CLIENT_SECRET';
      mockedConfig.crm.auth.scope = 'CRM_SCOPE_URL';
      mockedConfig.crm.auth.userAssignedEntityClientId = 'USER_ASSIGNED_ENTITY_CLIENT_ID';
    });

    test('GIVEN valid credentials WHEN called THEN returns a new token', async () => {
      const expectedAccessToken = {
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs',
        expiresOnTimestamp: 213,
      };
      mockedChainedTokenCredential.prototype.getToken.mockResolvedValue(expectedAccessToken);

      let actualToken = 'TEST';
      const callback: (token: string) => void = (token) => {
        actualToken = token;
      };
      await onTokenRefresh(callback);

      expect(mockedChainedTokenCredential.prototype.getToken).toHaveBeenCalledWith('CRM_SCOPE_URL');
      expect(actualToken).toBe(expectedAccessToken.token);
      expect(mockedLogger.error).toHaveBeenCalledTimes(0);
    });

    test('GIVEN getToken fails WHEN called THEN returns empty string', async () => {
      const crmError = new Error('fail');
      mockedChainedTokenCredential.prototype.getToken.mockRejectedValue(crmError);

      let actualToken = 'TEST';
      const callback: (token: string) => void = (token) => {
        actualToken = token;
      };
      await onTokenRefresh(callback);

      expect(mockedChainedTokenCredential.prototype.getToken).toHaveBeenCalledWith('CRM_SCOPE_URL');
      expect(actualToken).toBe('');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        crmError,
        'dynamicsWebApi::onTokenRefresh: Failed to authenticate with CRM - fail',
      );
    });
  });
});
