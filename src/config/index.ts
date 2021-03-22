import { toNumberOrDefault } from '../utils/number';

const useSarasStub = process.env.USE_SARAS_STUB === 'true';
const sarasUrl = useSarasStub ? `${process.env.SARAS_STUB_URL || ''}/api/v1/` : `${process.env.SARAS_URL || ''}/v1/api/`;
const crmBaseUrl = process.env.CRM_BASE_URL || '';

const config = {
  saras: {
    apiUrl: sarasUrl,
    maxRetries: toNumberOrDefault(process.env.SARAS_MAX_RETRIES, 10),
    identity: {
      azureTenantId: process.env.AZURE_TENANT_ID || '',
      azureClientId: process.env.CBIBOOKING_CLIENT_ID || '',
      azureClientSecret: process.env.CBIBOOKING_CLIENT_SECRET || '',
      scope: process.env.CBIBOOKING_SCOPE || '',
      userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',
    },
  },
  crm: {
    apiUrl: `${crmBaseUrl}/api/data/v9.1/`,
    maxRetries: toNumberOrDefault(process.env.CRM_MAX_RETRIES, 10),
    auth: {
      url: process.env.CRM_TOKEN_URL || '',
      clientId: process.env.CRM_CLIENT_ID || '',
      clientSecret: process.env.CRM_CLIENT_SECRET || '',
      resource: crmBaseUrl,
    },
  },
};

export {
  config,
};
