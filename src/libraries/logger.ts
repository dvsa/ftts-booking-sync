import { Logger as AzureLogger } from '@dvsa/azure-logger';
import { InternalAccessDeniedError } from '@dvsa/egress-filtering';

type EventsMap = Map<number | undefined, string>;

const SARAS_ERROR_EVENTS: EventsMap = new Map([
  [400, 'CBS_TE_BAD_REQUEST'],
  [401, 'CBS_TE_AUTH_ISSUE'],
  [404, 'CBS_TE_NOT_FOUND'],
  [500, 'CBS_TE_INTERNAL_ERROR'],
]);

const CRM_ERROR_EVENTS: EventsMap = new Map([
  [400, 'CBS_CDS_BAD_REQUEST'],
  [401, 'CBS_CDS_CONNECTIVITY_ISSUE'],
  [403, 'CBS_CDS_CONNECTIVITY_ISSUE'],
  [404, 'CBS_CDS_NOT_FOUND'],
  [500, 'CBS_CDS_INTERNAL_ERROR'],
]);

class Logger extends AzureLogger {
  constructor() {
    super('ftts', 'ftts-booking-sync');
  }

  logSarasEvent(status: number | undefined): void {
    const event = SARAS_ERROR_EVENTS.get(status);
    if (event) {
      this.event(event);
    }
  }

  logCrmEvent(status: number | undefined): void {
    const event = CRM_ERROR_EVENTS.get(status);
    if (event) {
      this.event(event);
    }
  }

  logInternalAccessDeniedEvent(error: InternalAccessDeniedError): void {
    const { message, host, port } = error;
    this.event('NOT_WHITELISTED_URL_CALL', message, { host, port });
  }
}

const logger = new Logger(); // Singleton logger instance

export {
  Logger,
  logger,
};
