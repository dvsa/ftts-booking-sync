import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Container from 'typedi';
import DynamicsWebApi, { RetrieveMultipleRequest, RequestError } from 'dynamics-web-api';
import { cdsRetry } from '@dvsa/cds-retry';

import { config } from '../../config';
import { Logger } from '../../libraries/logger';
import { rethrowIfEgressFilteringError } from '../../libraries/egress-filter';
import { CrmError } from '../../errors';
import { Collection, BookingStatus, TestStatus } from '../../enum/crm';
import { BookingDetails, BookingReference } from '../../interfaces/domain';
import { CRMResponse, CRMBookingProduct, CRMBookingReference } from '../../interfaces/crm';
import { buildRetrieveBookingDetailsRequest } from './requests';
import { CRMMapper } from './mappers';

dayjs.extend(utc);

class CRM {
  constructor(
    private dynamicsWebApi: DynamicsWebApi = Container.get('dynamicsWebApi'),
    private logger: Logger = Container.get('logger'),
    private crmMapper: CRMMapper = new CRMMapper(),
  ) { }

  /**
   * Get all new bookings and their related entities needed for test engine processing.
   * Bookings must meet the following conditions:
   * - 'confirmed' or 'cancellation in progress' or 'change in progress' booking status
   * - ftts_testengineinitialsentdate is null - indicates booking has NOT been synced before
   * - test date within 72 hours of now (UTC)
   */
  public async getNewBookings(): Promise<BookingDetails[]> {
    const now = dayjs();
    const nowPlus72Hours = now.add(72, 'hour');
    const betweenQuery = `Microsoft.Dynamics.CRM.Between(PropertyName='ftts_testdate', PropertyValues=['${now.startOf('day').toISOString()}', '${nowPlus72Hours.toISOString()}'])`;
    const bookingStatusQuery = `(ftts_bookingstatus eq ${BookingStatus.CONFIRMED} or ftts_bookingstatus eq ${BookingStatus.CANCELLATION_IN_PROGRESS} or ftts_bookingstatus eq ${BookingStatus.CHANGE_IN_PROGRESS})`;
    const filterQuery = `${bookingStatusQuery} and ftts_testengineinitialsentdate eq null and ${betweenQuery} and _ftts_bookingid_value ne null and _ftts_candidateid_value ne null`;

    return this.sendBookingDetailsRequest(filterQuery, 'getNewBookings');
  }

  /**
   * Get all cancelled bookings that have already been sent to test engine.
   * Returns just the bookingProductId and reference number.
   */
  public async getCancelledBookings(): Promise<BookingReference[]> {
    const mainFilterCondition = 'ftts_testenginebookingupdated ge ftts_testengineinitialsentdate';
    const filterQuery = `ftts_bookingstatus eq ${BookingStatus.CANCELLED} and ftts_testengineinitialsentdate ne null and ftts_testenginebookingupdated ne null and ${mainFilterCondition} and _ftts_bookingid_value ne null and _ftts_candidateid_value ne null and Microsoft.Dynamics.CRM.OnOrAfter(PropertyName='ftts_testdate',PropertyValue='${dayjs().startOf('day').toISOString()}')`;

    const request: RetrieveMultipleRequest = {
      collection: Collection.BOOKING_PRODUCTS,
      select: ['ftts_reference', 'ftts_bookingproductid'],
      filter: filterQuery,
    };

    try {
      const response = await this.retry(() => this.dynamicsWebApi.retrieveMultipleRequest(request)) as CRMResponse<CRMBookingReference>;
      return response.value.map((item) => ({
        id: item.ftts_bookingproductid,
        reference: item.ftts_reference,
      }));
    } catch (e) {
      rethrowIfEgressFilteringError(e);
      const err = e as RequestError;
      this.logger.critical(`CRM::getCancelledBookings: ${err.status ?? 'Unknown'} error retrieving booking products matching the criteria`, {
        error: err.toString(),
      });
      this.logger.logCrmEvent(err.status);
      throw new CrmError(err.message, err.status);
    }
  }

  /**
   * Get all updated bookings meeting the following conditions:
   * - 'confirmed' booking status,
   * - ftts_testengineinitialsentdate not null - indicates that the booking has been synced before
   * - ftts_testenginebookingupdated date is after the date a booking was last synced at
   */
  public async getUpdatedBookings(): Promise<BookingDetails[]> {
    const mainFilterCondition = 'ftts_testenginebookingupdated gt ftts_testengineinitialsentdate';
    const filterQuery = `ftts_bookingstatus eq ${BookingStatus.CONFIRMED} and ftts_testengineinitialsentdate ne null and ${mainFilterCondition} and Microsoft.Dynamics.CRM.OnOrAfter(PropertyName='ftts_testdate',PropertyValue='${dayjs().startOf('day').toISOString()}')`;

    return this.sendBookingDetailsRequest(filterQuery, 'getUpdatedBookings');
  }

  /**
   * Returns true if a candidate has a test pass for the given test type that will still be valid on the given date.
   * Swallows any errors and just returns false if the call fails.
   */
  public async candidateHasValidTestPass(candidateId: string, testType: number, onDate: string): Promise<boolean> {
    const candidate = `_ftts_person_value eq ${candidateId}`;
    const testTypeCondition = `ftts_Testtype/ftts_testenginetesttype eq ${testType}`;
    const testStatusCondition = `ftts_teststatus eq ${TestStatus.PASSED}`;

    // Set time to start of day 00:00 as CRM expiry date has 00:00 time by default but valididity is to end of day
    const validOnDate = dayjs.utc(onDate).startOf('day').toISOString();
    const expiryDateCondition = `ftts_expirydate ge ${validOnDate}`;

    const filterQuery = `${candidate} and ${testTypeCondition} and ${testStatusCondition} and ${expiryDateCondition}`;

    try {
      const result = await this.retry(() => this.dynamicsWebApi.count(Collection.TEST_HISTORIES, filterQuery)) as number;
      return result > 0;
    } catch (e) {
      rethrowIfEgressFilteringError(e);
      const err = e as RequestError;
      this.logger.critical(`CRM::candidateHasValidTestPass: ${err.status || 'Unknown'} error checking candidate test history`, {
        candidateId,
        error: err.toString(),
      });
      this.logger.logCrmEvent(err.status);
      return false;
    }
  }

  /**
   * Update the booking product's ftts_testengineinitialsentdate with the given timestamp to mark the booking processed
   */
  public async updateBookingSyncDate(bookingProductId: string, syncTimestamp: string): Promise<void> {
    try {
      await this.retry(() => this.dynamicsWebApi.updateSingleProperty(bookingProductId, Collection.BOOKING_PRODUCTS, {
        ftts_testengineinitialsentdate: syncTimestamp,
      }));
    } catch (e) {
      rethrowIfEgressFilteringError(e);
      const err = e as RequestError;
      this.logger.critical(`CRM::updateBookingSyncDate: ${err.status ?? 'Unknown'} error updating booking product`, {
        bookingProductId,
        error: err.toString(),
      });
      this.logger.logCrmEvent(err.status);
      throw new CrmError(err.message, err.status);
    }
  }

  private async sendBookingDetailsRequest(filterQuery: string, method: string): Promise<BookingDetails[]> {
    const request = buildRetrieveBookingDetailsRequest();
    request.filter = filterQuery;

    try {
      const response = await this.retry(() => this.dynamicsWebApi.retrieveMultipleRequest(request)) as CRMResponse<CRMBookingProduct>;
      return response.value.reduce((result: BookingDetails[], item: CRMBookingProduct) => {
        const bookingDetails: BookingDetails | undefined = this.crmMapper.crmBookingToBookingDetails(item);
        if (bookingDetails) {
          result.push(bookingDetails);
        }
        return result;
      }, []);
    } catch (e) {
      rethrowIfEgressFilteringError(e);
      const err = e as RequestError;
      this.logger.critical(`CRM::${method}: ${err.status ?? 'Unknown'} error retrieving booking products matching the criteria`, {
        error: err.toString(),
      });
      this.logger.logCrmEvent(err.status);
      throw new CrmError(err.message, err.status);
    }
  }

  private async retry(asyncFunction: () => Promise<unknown>): Promise<unknown> {
    const retryPolicy = { retries: config.crm.maxRetries };
    return cdsRetry(asyncFunction, retryPolicy, (e: RequestError) => {
      this.logger.logCrmEvent(e.status);
      this.logger.warn('Retrying failed CRM request', {
        errorStatus: e.status,
        errorMessage: e.message,
      });
    });
  }
}

export {
  CRM,
};
