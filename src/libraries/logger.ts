import { Logger as AzureLogger } from '@dvsa/azure-logger';
import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { config } from '../config';
import { BookingDetails } from '../interfaces/domain';

export enum BusinessTelemetry {
  NOT_WHITELISTED_URL_CALL = 'NOT_WHITELISTED_URL_CALL',
  CBS_TE_BAD_REQUEST = 'CBS_TE_BAD_REQUEST',
  CBS_TE_AUTH_ISSUE = 'CBS_TE_AUTH_ISSUE',
  CBS_TE_NOT_FOUND = 'CBS_TE_NOT_FOUND',
  CBS_TE_INTERNAL_ERROR = 'CBS_TE_INTERNAL_ERROR',
  CBS_CDS_BAD_REQUEST = 'CBS_CDS_BAD_REQUEST',
  CBS_CDS_CONNECTIVITY_ISSUE = 'CBS_CDS_CONNECTIVITY_ISSUE',
  CBS_CDS_NOT_FOUND = 'CBS_CDS_NOT_FOUND',
  CBS_CDS_INTERNAL_ERROR = 'CBS_CDS_INTERNAL_ERROR',
  CBS_CDS_CORRUPTED_DATA = 'CBS_CDS_CORRUPTED_DATA',
  CBS_TE_SUCC_CREATE = 'CBS_TE_SUCC_CREATE',
  CBS_TE_SUCC_DELETE = 'CBS_TE_SUCC_DELETE',
  CBS_TE_SUCC_UPDATE = 'CBS_TE_SUCC_UPDATE',
}

type EventsMap = Map<number | undefined, string>;

const SARAS_ERROR_EVENTS: EventsMap = new Map([
  [400, BusinessTelemetry.CBS_TE_BAD_REQUEST],
  [401, BusinessTelemetry.CBS_TE_AUTH_ISSUE],
  [404, BusinessTelemetry.CBS_TE_NOT_FOUND],
  [500, BusinessTelemetry.CBS_TE_INTERNAL_ERROR],
]);

const CRM_ERROR_EVENTS: EventsMap = new Map([
  [400, BusinessTelemetry.CBS_CDS_BAD_REQUEST],
  [401, BusinessTelemetry.CBS_CDS_CONNECTIVITY_ISSUE],
  [403, BusinessTelemetry.CBS_CDS_CONNECTIVITY_ISSUE],
  [404, BusinessTelemetry.CBS_CDS_NOT_FOUND],
  [500, BusinessTelemetry.CBS_CDS_INTERNAL_ERROR],
]);

export type EventIdentifier = {
  appointmentId?: string;
  bookingProductId?: string;
  testDate?: string;
  testEngineTestType?: number;
  tcnTestName?: string;
  testEngineTestCentreCode?: string;
  tcnTestCentreId?: string;
};

export const getIdentifiers = (booking: BookingDetails): EventIdentifier => ({
  appointmentId: booking?.bookingProduct?.reference,
  bookingProductId: booking?.bookingProduct?.id,
  testDate: booking?.bookingProduct?.testDate,
  testEngineTestType: booking?.product?.testType,
  tcnTestName: booking?.product?.tcnTestName,
  testEngineTestCentreCode: booking?.organisation?.testCentreCode,
  tcnTestCentreId: booking?.organisation?.tcnTestCentreId,
});

class Logger extends AzureLogger {
  constructor() {
    super('FTTS', config.websiteSiteName);
  }

  logSarasEvent(status: number | undefined, properties?: Record<string, unknown>): void {
    const event = SARAS_ERROR_EVENTS.get(status);
    if (event) {
      this.event(event, undefined, properties);
    }
  }

  logCrmEvent(status: number | undefined, properties?: Record<string, unknown>): void {
    const event = CRM_ERROR_EVENTS.get(status);
    if (event) {
      this.event(event, undefined, properties);
    }
  }

  logInternalAccessDeniedEvent(error: InternalAccessDeniedError): void {
    const { message, host, port } = error;
    this.event(BusinessTelemetry.NOT_WHITELISTED_URL_CALL, message, { host, port });
  }
}

const logger = new Logger(); // Singleton logger instance

export {
  Logger,
  logger,
};
