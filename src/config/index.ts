import { toNumberOrDefault } from '../utils/number';

const crmBaseUrl = process.env.CRM_BASE_URL || '';

const config = {
  websiteSiteName: process.env.WEBSITE_SITE_NAME || '',
  saras: {
    apiUrl: process.env.SARAS_URL || '',
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
    newBookingsWindow: toNumberOrDefault(process.env.NEW_BOOKING_WINDOW, 72),
    auth: {
      tenantId: process.env.CRM_TENANT_ID || '',
      clientId: process.env.CRM_CLIENT_ID || '',
      clientSecret: process.env.CRM_CLIENT_SECRET || '',
      userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',
      scope: process.env.CRM_SCOPE || '',
    },
  },
  featureToggles: {
    enableSarasApiVersion2: process.env.ENABLE_SARAS_API_VERSION_2 === 'true' || true,
  },
};

export {
  config,
};
