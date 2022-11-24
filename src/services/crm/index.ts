/* eslint-disable no-template-curly-in-string */
import fs from 'fs';
import path from 'path';
import { cdsRetry } from '@dvsa/cds-retry';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import DynamicsWebApi, { FetchXmlResponse, RequestError } from 'dynamics-web-api';
import Container from 'typedi';

import { config } from '../../config';
import { Logger } from '../../libraries/logger';
import { rethrowIfEgressFilteringError } from '../../libraries/egress-filter';
import { CrmError } from '../../errors';
import {
  Collection, BookingStatus, TestStatus, TestType, Remit, Origin,
} from '../../enum/crm';
import { BookingDetails } from '../../interfaces/domain';
import { CRMResponse, CRMBookingProduct, CRMTestHistory } from '../../interfaces/crm';
import { buildRetrieveBookingDetailsRequest } from './requests';
import { CRMMapper } from './mappers';
import { Organisation } from '../../enum/saras';

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
   * - test date within defined number of hours from now (UTC) (default 72 hours)
   */
  public async getNewBookings(): Promise<BookingDetails[]> {
    const now = dayjs();
    const limit = now.add(config.crm.newBookingsWindow, 'hour');
    const betweenQuery = `Microsoft.Dynamics.CRM.Between(PropertyName='ftts_testdate', PropertyValues=['${now.startOf('day').toISOString()}', '${limit.toISOString()}'])`;
    const bookingStatusQuery = `(ftts_bookingstatus eq ${BookingStatus.CONFIRMED} or ftts_bookingstatus eq ${BookingStatus.CANCELLATION_IN_PROGRESS} or ftts_bookingstatus eq ${BookingStatus.CHANGE_IN_PROGRESS})`;
    const filterQuery = `${bookingStatusQuery} and ftts_testengineinitialsentdate eq null and ${betweenQuery} and _ftts_bookingid_value ne null and _ftts_candidateid_value ne null`;

    return this.sendBookingDetailsRequest(filterQuery, 'getNewBookings');
  }

  /**
   * Get all cancelled bookings that have already been sent to test engine.
   */
  public async getCancelledBookings(): Promise<BookingDetails[]> {
    const mainFilterCondition = 'ftts_testenginebookingupdated ge ftts_testengineinitialsentdate';
    const filterQuery = `ftts_bookingstatus eq ${BookingStatus.CANCELLED} and ftts_testengineinitialsentdate ne null and ftts_testenginebookingupdated ne null and ${mainFilterCondition} and _ftts_bookingid_value ne null and _ftts_candidateid_value ne null and Microsoft.Dynamics.CRM.OnOrAfter(PropertyName='ftts_testdate',PropertyValue='${dayjs().startOf('day').toISOString()}')`;

    return this.sendBookingDetailsRequest(filterQuery, 'getCancelledBookings');
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
   * This is only used for v1 of SARAS API with the flag ENABLE_SARAS_API_VERSION_2=false
   */
  public async candidateHasValidTestPass(candidateId: string, testType: number, onDate: string): Promise<boolean> {
    const filterQuery = this.getCandidateLastPassedTestsQuery(candidateId, testType, onDate);
    this.logger.debug('CRM::candidateHasValidTestPass: test histories count request filter query', { filterQuery });

    try {
      const result = await this.retry(() => this.dynamicsWebApi.count(Collection.TEST_HISTORIES, filterQuery)) as number;
      this.logger.debug('CRM::candidateHasValidTestPass: test histories count raw response', { response: result });
      return result > 0;
    } catch (e) {
      rethrowIfEgressFilteringError(e);
      const err = e as RequestError;
      this.logger.critical(`CRM::candidateHasValidTestPass: ${err.status ?? 'Unknown'} error checking candidate test history`, {
        candidateId,
        error: err,
      });
      this.logger.logCrmEvent(err.status, { candidateId });
      return false;
    }
  }

  /**
   * Returns the start date of test results or a given test type for a candidate, fitlered by the organisation
   * This is only used for v2 of SARAS API with the flag ENABLE_SARAS_API_VERSION_2=true
   */
  public async getLastPassedTestDate(candidateId: string, testType: number, organisation: Organisation): Promise<string | undefined> {
    const testHistories = await this.fetchCorrespondingResults(candidateId, testType, organisation);
    const testHistory = testHistories ? testHistories[0] : undefined;

    if (testHistory) {
      if (!testHistory.testDate) {
        this.logger.warn('CRM::getLastPassedTestDate: Test history does not have a test date', {
          testHistoryId: testHistory.testHistoryId,
          candidateId: testHistory.candidateId,
        });

        return undefined;
      }

      return testHistory.testDate;
    }

    return undefined;
  }

  private async fetchCorrespondingResults(candidateId: string, testEngineTestType: TestType, organisation: Organisation): Promise<CRMTestHistory[] | undefined> {
    try {
      const filename = organisation === Organisation.DVA ? 'getCorrespondingDvaTestResults.xml' : 'getCorrespondingDvsaTestResults.xml';
      this.logger.info('CRM::fetchCorrespondingResults: Trying to fetch corresponding results', {
        filename,
        candidateId,
        testEngineTestType,
        organisation,
      });
      // the filename is not passed in from user input, so safe to ignore
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const fetchXml = await this.readFile(filename);
      this.logger.debug('CRM::fetchCorrespondingDvsaResults: fetched Xml', {
        filename,
        fetchXml,
        testEngineTestType,
        organisation,
      });

      const finalFetchXml = this.getInjectedXml(fetchXml, candidateId, testEngineTestType);

      this.logger.debug('CRM::fetchCorrespondingResults: Fetching Corresponding Test Results Raw Request', {
        entity: 'ftts_testhistories',
        fetchXml: finalFetchXml,
      });
      const fetchXmlResponse: FetchXmlResponse<CRMTestHistory> = await this.dynamicsWebApi.fetch(
        'ftts_testhistories',
        finalFetchXml,
      );
      this.logger.debug('CRM::fetchCorrespondingResults: Corresponding Test Results Raw Response', {
        entity: 'ftts_testhistories',
        fetchXmlResponse,
        organisation,
      });

      if (!fetchXmlResponse.value) {
        return undefined;
      }
      if (fetchXmlResponse?.value?.length <= 0) {
        return undefined;
      }
      return this.removeResultsWithoutRemits(fetchXmlResponse.value);
    } catch (error) {
      rethrowIfEgressFilteringError(error);
      this.logger.error(error as Error, 'CRM::fetchCorrespondingResults: Failed to load corresponding Test Results', {
        message: (error as Error)?.message,
        organisation,
        testEngineTestType,
      });
      const err = error as RequestError;
      this.logger.logCrmEvent(err.status);
      throw new CrmError(err.message, err.status);
    }
  }

  /**
   * Update the booking product's ftts_testengineinitialsentdate with the given timestamp to mark the booking processed
   */
  public async updateBookingSyncDate(bookingProductId: string, syncTimestamp: string): Promise<void> {
    this.logger.debug(`CRM::updateBookingSyncDate: updating booking product ${bookingProductId} with timestamp ${syncTimestamp}`, {
      bookingProductId,
      syncTimestamp,
    });
    try {
      await this.retry(() => this.dynamicsWebApi.updateSingleProperty(bookingProductId, Collection.BOOKING_PRODUCTS, {
        ftts_testengineinitialsentdate: syncTimestamp,
      }));
      this.logger.debug(`CRM::updateBookingSyncDate: updating booking product ${bookingProductId} successful`, {
        bookingProductId,
        syncTimestamp,
      });
    } catch (e) {
      rethrowIfEgressFilteringError(e);
      const err = e as RequestError;
      this.logger.critical(`CRM::updateBookingSyncDate: ${err.status ?? 'Unknown'} error updating booking product`, {
        bookingProductId,
        error: err,
      });
      this.logger.logCrmEvent(err.status, { bookingProductId });
      throw new CrmError(err.message, err.status);
    }
  }

  private async sendBookingDetailsRequest(filterQuery: string, methodName: string): Promise<BookingDetails[]> {
    const request = buildRetrieveBookingDetailsRequest();
    request.filter = filterQuery;

    this.logger.debug(`CRM::${methodName}: retrieve booking products raw request`, { request });

    try {
      const response = await this.retry(() => this.dynamicsWebApi.retrieveMultipleRequest(request)) as CRMResponse<CRMBookingProduct>;
      this.logger.debug(`CRM::${methodName}: retrieve booking products raw response: ${JSON.stringify(response.value)}`);
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
      this.logger.critical(`CRM::${methodName}: ${err.status ?? 'Unknown'} error retrieving booking products matching the criteria`, {
        error: err,
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

  private getCandidateLastPassedTestsQuery(candidateId: string, testType: number, onDate: string): string {
    const candidate = `_ftts_person_value eq ${candidateId}`;
    const testTypeCondition = `ftts_Testtype/ftts_testenginetesttype eq ${testType}`;
    const testStatusCondition = `ftts_teststatus eq ${TestStatus.PASSED}`;

    // Set time to start of day 00:00 as CRM expiry date has 00:00 time by default but validity is to end of day
    const validOnDate = dayjs.utc(onDate).startOf('day').toISOString();
    const expiryDateCondition = `ftts_expirydate ge ${validOnDate}`;

    return `${candidate} and ${testTypeCondition} and ${testStatusCondition} and ${expiryDateCondition}`;
  }

  private async readFile(fileName: string): Promise<string> {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return fs.promises.readFile(path.resolve(__dirname, `data/${fileName}`), 'utf-8');
  }

  private removeResultsWithoutRemits(crmTestHistories?: CRMTestHistory[]): CRMTestHistory[] | undefined {
    if (!crmTestHistories) {
      return crmTestHistories;
    }

    return crmTestHistories.filter((testHistory) => {
      if (!testHistory.testCentreRemit && testHistory.origin !== Origin.IHTTC_PORTAL) {
        this.logger.warn('CRM::removeResultsWithoutRemits: Not retrieving candidate\'s test result due to missing remit', {
          candidateId: testHistory.candidateId,
          bookingProductRef: testHistory.bookingProductReference,
          testHistoryId: testHistory.testHistoryId,
        });
        return false;
      }

      return true;
    });
  }

  private getInjectedXml(xml: string, candidateId: string, testEngineTestType: TestType): string {
    return xml
      .replace(/\${statusPass}/g, String(TestStatus.PASSED))
      .replace('${candidateId}', candidateId)
      .replace('${correspondingTestEngineTestType}', String(testEngineTestType))
      .replace('${dva}', String(Remit.DVA));
  }

  private getDvaInjectedXml(xml: string, candidateId: string, testEngineTestType: TestType): string {
    return xml
      .replace(/\${statusPass}/g, String(TestStatus.PASSED))
      .replace('${candidateId}', candidateId)
      .replace('${correspondingTestEngineTestType}', String(testEngineTestType))
      .replace('${dva}', String(Remit.DVA));
  }
}

export {
  CRM,
};
