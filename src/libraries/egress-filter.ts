import { AzureFunction, Context } from '@azure/functions';
import { EgressFilter, InternalAccessDeniedError, addressParser } from '@dvsa/egress-filtering';

import { config } from '../config';
import { logger } from './logger';

const withEgressFiltering = (originalFn: AzureFunction) => async (context: Context): Promise<void> => {
  const egressFilter = EgressFilter.getInstance();
  egressFilter.allow(addressParser.parseUri(config.crm.apiUrl));
  egressFilter.allow(addressParser.parseUri(config.saras.apiUrl));

  const onUnhandledRejection = (error: unknown): void => {
    if (error instanceof InternalAccessDeniedError) {
      logger.logInternalAccessDeniedEvent(error);
    }
    throw error;
  };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    await originalFn.call(undefined, context);
  } catch (error) {
    if (error instanceof InternalAccessDeniedError) {
      logger.logInternalAccessDeniedEvent(error);
    }
    throw error;
  } finally {
    process.removeListener('unhandledRejection', onUnhandledRejection);
  }
};

const rethrowIfEgressFilteringError = (error: unknown): void => {
  if (error instanceof InternalAccessDeniedError) {
    throw error;
  }
};

export {
  withEgressFiltering,
  rethrowIfEgressFilteringError,
};
