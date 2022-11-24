import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { AzureFunction, Context } from '@azure/functions';
import { withEgressFiltering } from '@dvsa/egress-filtering';

import { loader } from '../loaders';
import { Synchroniser } from './sync';
import { allowedAddresses, onInternalAccessDeniedError } from '../libraries/egress-filter';
import { logger } from '../libraries/logger';

const syncTimerTrigger: AzureFunction = async (): Promise<void> => {
  const syncTimestamp = new Date().toISOString();
  await loader(); // Instantiate and inject dependencies
  const sync = new Synchroniser(syncTimestamp);
  await sync.processBookings();
};

export const index = async (context: Context): Promise<void> => nonHttpTriggerContextWrapper(
  withEgressFiltering(syncTimerTrigger, allowedAddresses, onInternalAccessDeniedError, logger),
  context,
);
