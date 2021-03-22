import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { AzureFunction, Context } from '@azure/functions';
import Container from 'typedi';

import { loader } from '../loaders';
import { Synchroniser } from './sync';
import { Logger } from '../libraries/logger';
import { withEgressFiltering } from '../libraries/egress-filter';

const syncTimerTrigger: AzureFunction = async (): Promise<void> => {
  const syncTimestamp = new Date().toISOString();

  // Instantiate and inject dependencies
  await loader();

  const logger = Container.get<Logger>('logger');
  logger.event('LAUNCH', 'Synchroniser timer');
  logger.info('Running booking synchroniser');

  const sync = new Synchroniser(syncTimestamp);
  await sync.processBookings();

  logger.info('Booking synchroniser finished');
};

export default async (context: Context): Promise<void> => nonHttpTriggerContextWrapper(
  withEgressFiltering(syncTimerTrigger),
  context,
);
