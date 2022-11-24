import { addressParser, Address, InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { config } from '../config';
import { logger } from './logger';

const allowedAddresses: Array<Address> = [
  addressParser.parseUri(config.crm.apiUrl),
  addressParser.parseUri(config.saras.apiUrl),
];

const onInternalAccessDeniedError = (error: InternalAccessDeniedError): void => {
  logger.security('egress::OnInternalAccessDeniedError: url is not whitelisted so it cannot be called', {
    host: error.host,
    port: error.port,
    reason: JSON.stringify(error),
  });
  logger.logInternalAccessDeniedEvent(error);
  throw error;
};

const rethrowIfEgressFilteringError = (error: unknown): void => {
  if (error instanceof InternalAccessDeniedError) {
    throw error;
  }
};

export {
  allowedAddresses,
  onInternalAccessDeniedError,
  rethrowIfEgressFilteringError,
};
