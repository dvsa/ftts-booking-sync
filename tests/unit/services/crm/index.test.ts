/* eslint-disable no-template-curly-in-string */
import MockDate from 'mockdate';
import Container from 'typedi';
import fs from 'fs';

import { CRM } from '../../../../src/services/crm';
import { buildMockCRMBookingProducts } from '../../../stubs/crm';
import { mockBookings } from '../../../stubs/domain';
import { CrmError } from '../../../../src/errors';
import { BusinessTelemetry } from '../../../../src/libraries/logger';
import {
  Origin, Remit, TestStatus, TestType,
} from '../../../../src/enum/crm';
import { Organisation } from '../../../../src/enum/saras';

jest.mock('typedi');
jest.mock('@dvsa/cds-retry', () => ({
  cdsRetry: (fn: () => Promise<unknown>) => fn(),
}));
jest.mock('../../../../src/config', () => ({
  config: {
    crm: {
      newBookingsWindow: 2,
      apiUrl: 'fake-url',
    },
    saras: {
      apiUrl: 'fake-url',
    },
    websiteSiteName: 'test',
  },
}));

const mockError = {
  message: 'Error message',
  status: 500,
  toString: () => 'Mock Error',
};

describe('CRM client', () => {
  MockDate.set('2020-05-09T11:30:00Z');
  const mockDynamicsWebApi = {
    retrieveMultipleRequest: jest.fn(),
    updateSingleProperty: jest.fn(),
    count: jest.fn(),
    fetch: jest.fn(),
  };

  const mockLogger = {
    warn: jest.fn(),
    critical: jest.fn(),
    debug: jest.fn(),
    logCrmEvent: jest.fn(),
    error: jest.fn(),
    event: jest.fn(),
    audit: jest.fn(),
    info: jest.fn(),
  };

  Container.get = jest.fn((library: string) => {
    const stored = {
      dynamicsWebApi: mockDynamicsWebApi,
      logger: mockLogger,
    };
    return stored[library] as unknown;
  }) as jest.Mock;

  const crm = new CRM();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNewBookings', () => {
    test('calls CRM to get all new bookings', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getNewBookings();

      expect(mockDynamicsWebApi.retrieveMultipleRequest).toHaveBeenCalledWith(expect.objectContaining({
        filter: '(ftts_bookingstatus eq 675030001 or ftts_bookingstatus eq 675030002 or ftts_bookingstatus eq 675030003) and ftts_testengineinitialsentdate eq null and Microsoft.Dynamics.CRM.Between(PropertyName=\'ftts_testdate\', PropertyValues=[\'2020-05-08T23:00:00.000Z\', \'2020-05-09T13:30:00.000Z\']) and _ftts_bookingid_value ne null and _ftts_candidateid_value ne null',
      }));
      expect(result).toStrictEqual(mockBookings);
    });

    test('logs and throws an error if the call to CRM fails', async () => {
      mockDynamicsWebApi.retrieveMultipleRequest.mockRejectedValue(mockError);

      await expect(crm.getNewBookings()).rejects.toThrow(CrmError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'CRM::getNewBookings: 500 error retrieving booking products matching the criteria',
        { error: mockError },
      );
    });

    test('skips results it cannot map because of bad data in CRM', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockCRMBookingProducts[0].ftts_productid = null;
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getNewBookings();

      expect(result).not.toContainEqual(mockBookings[0]);
      expect(result).toContainEqual(mockBookings[1]);
      expect(mockLogger.event).toHaveBeenCalledWith(
        BusinessTelemetry.CBS_CDS_CORRUPTED_DATA,
        `CRMMapper::crmBookingToBookingDetails: Booking product ${mockCRMBookingProducts[0].ftts_bookingproductid} missing required data`,
        {
          ftts_bookingproductid: mockCRMBookingProducts[0].ftts_bookingproductid,
          ftts_reference: mockCRMBookingProducts[0].ftts_reference,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.any(TypeError),
        },
      );
    });

    test('skips results with missing booking reference', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockCRMBookingProducts[0].ftts_reference = null;
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getNewBookings();

      expect(result).not.toContainEqual(mockBookings[0]);
      expect(result).toContainEqual(mockBookings[1]);
      expect(mockLogger.event).toHaveBeenCalledWith(
        BusinessTelemetry.CBS_CDS_CORRUPTED_DATA,
        `CRMMapper::crmBookingToBookingDetails: Booking product ${mockCRMBookingProducts[0].ftts_bookingproductid} missing required data`,
        {
          ftts_bookingproductid: mockCRMBookingProducts[0].ftts_bookingproductid,
          ftts_reference: null,
          error: new Error('Missing booking reference'),
        },
      );
    });

    test('skips results with missing test centre', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockCRMBookingProducts[0].ftts_ihttcid = null;
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getNewBookings();

      expect(result).not.toContainEqual(mockBookings[0]);
      expect(result).toContainEqual(mockBookings[1]);
      expect(mockLogger.event).toHaveBeenCalledWith(
        BusinessTelemetry.CBS_CDS_CORRUPTED_DATA,
        `CRMMapper::crmBookingToBookingDetails: Booking product ${mockCRMBookingProducts[0].ftts_bookingproductid} missing required data`,
        {
          ftts_bookingproductid: mockCRMBookingProducts[0].ftts_bookingproductid,
          ftts_reference: mockCRMBookingProducts[0].ftts_reference,
          error: new Error('Missing linked test centre entity'),
        },
      );
    });

    test('includes results with null parentaccountid', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockCRMBookingProducts[0].ftts_ihttcid.parentaccountid = null;
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getNewBookings();

      expect(result).toHaveLength(2);
    });
  });

  describe('getCancelledBookings', () => {
    test('calls CRM to get cancelled bookings', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getCancelledBookings();

      expect(result).toStrictEqual(mockBookings);
    });

    test('logs and throws an error if the call to CRM fails', async () => {
      mockDynamicsWebApi.retrieveMultipleRequest.mockRejectedValue(mockError);

      await expect(crm.getCancelledBookings()).rejects.toThrow(CrmError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'CRM::getCancelledBookings: 500 error retrieving booking products matching the criteria',
        { error: mockError },
      );
    });
  });

  describe('getUpdatedBookings', () => {
    test('calls CRM to get updated bookings', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getUpdatedBookings();

      expect(result).toStrictEqual(mockBookings);
    });

    test('logs and throws an error if the call to CRM fails', async () => {
      mockDynamicsWebApi.retrieveMultipleRequest.mockRejectedValue(mockError);

      await expect(crm.getUpdatedBookings()).rejects.toThrow(CrmError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'CRM::getUpdatedBookings: 500 error retrieving booking products matching the criteria',
        { error: mockError },
      );
    });

    test('skips results it cannot map because of bad data in CRM', async () => {
      const mockCRMBookingProducts = buildMockCRMBookingProducts();
      mockCRMBookingProducts[0].ftts_productid = null;
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getUpdatedBookings();

      expect(result).not.toContainEqual(mockBookings[0]);
      expect(result).toContainEqual(mockBookings[1]);
      expect(mockLogger.event).toHaveBeenCalledWith(
        BusinessTelemetry.CBS_CDS_CORRUPTED_DATA,
        `CRMMapper::crmBookingToBookingDetails: Booking product ${mockCRMBookingProducts[0].ftts_bookingproductid} missing required data`,
        {
          ftts_bookingproductid: mockCRMBookingProducts[0].ftts_bookingproductid,
          ftts_reference: mockCRMBookingProducts[0].ftts_reference,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          error: expect.any(TypeError),
        },
      );
    });
  });

  describe('candidateHasValidTestPass', () => {
    test('calls CRM to check if the candidate has a valid test pass for the given test type on the given date', async () => {
      mockDynamicsWebApi.count.mockResolvedValue(1);

      const result = await crm.candidateHasValidTestPass('123', 3, '2020-09-12');

      expect(result).toBe(true);
    });

    test('returns false if the candidate does not have a valid test pass', async () => {
      mockDynamicsWebApi.count.mockResolvedValue(0);

      const result = await crm.candidateHasValidTestPass('123', 3, '2020-09-12');

      expect(result).toBe(false);
    });

    test('logs and returns false if the call to CRM fails', async () => {
      mockDynamicsWebApi.count.mockRejectedValue(new Error());

      const result = await crm.candidateHasValidTestPass('123', 3, '2020-09-12');

      expect(result).toBe(false);
      expect(mockLogger.critical).toHaveBeenCalled();
    });
  });

  describe('getLastPassedTestDate', () => {
    test('calls CRM to return test results of candidate for a given test type', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({
        value: [
          {
            testHistoryId: 'mockTestHistoryId',
            testStatus: TestStatus.PASSED,
            testDate: '2021-07-30T16:00:00Z',
            testCentreRemit: Remit.DVSA_ENGLAND,
          },
        ],
      });

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVSA);

      expect(result).toBe('2021-07-30T16:00:00Z');
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('calls CRM to return test results of candidate for a given test type - DVA', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({
        value: [
          {
            testHistoryId: 'mockTestHistoryId',
            testStatus: TestStatus.PASSED,
            testDate: '2021-07-30T16:00:00Z',
            testCentreRemit: Remit.DVA,
          },
        ],
      });

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVA);

      expect(result).toBe('2021-07-30T16:00:00Z');
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('calls CRM to return test results of candidate for a given test type - IHTTC', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({
        value: [
          {
            testHistoryId: 'mockTestHistoryId',
            testStatus: TestStatus.PASSED,
            testDate: '2021-07-30T16:00:00Z',
            testCentreRemit: null,
            origin: Origin.IHTTC_PORTAL,
          },
        ],
      });

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVSA);

      expect(result).toBe('2021-07-30T16:00:00Z');
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('filter out bookings which do not have remits and are not ihttc bookings', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({
        value: [
          {
            testHistoryId: 'mockTestHistoryId',
            testStatus: TestStatus.PASSED,
            testDate: '2021-07-30T16:00:00Z',
            testCentreRemit: null,
            origin: Origin.CANDIDATE_BOOKING_PORTAL,
          },
        ],
      });

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVSA);

      expect(result).toBeUndefined();
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('returns undefined if candidate does not have any test results', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({
        value: [],
      });

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVSA);

      expect(result).toBeUndefined();
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('returns undefined if crm response does not have a value', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({});

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVSA);

      expect(result).toBeUndefined();
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('error calling CRM logs and throws the error', async () => {
      const error = new Error('error');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockRejectedValue(error);

      await expect(() => crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVSA))
        .rejects
        .toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(error, 'CRM::fetchCorrespondingResults: Failed to load corresponding Test Results', {
        message: 'error',
        organisation: 1,
        testEngineTestType: 3,
      });
    });

    test('returns undefined if candidate does not have any test results - DVA', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({
        value: [],
      });

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVA);

      expect(result).toBeUndefined();
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('returns undefined if crm response does not have a value - DVA', async () => {
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockResolvedValue({});

      const result = await crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVA);

      expect(result).toBeUndefined();
      expect(mockDynamicsWebApi.fetch).toHaveBeenCalledWith('ftts_testhistories', '<fetch>...2...5...</fetch>');
    });

    test('error calling CRM logs and throws the error - DVA', async () => {
      const error = new Error('error');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue('<fetch>...${statusPass}...5...</fetch>');
      mockDynamicsWebApi.fetch.mockRejectedValue(error);

      await expect(() => crm.getLastPassedTestDate('candidateId', TestType.LGV_MULTIPLE_CHOICE, Organisation.DVA))
        .rejects
        .toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(error, 'CRM::fetchCorrespondingResults: Failed to load corresponding Test Results', {
        message: 'error',
        organisation: 0,
        testEngineTestType: 3,
      });
    });
  });

  describe('updateBookingSyncDate', () => {
    const mockBookingProductId = '1';
    const mockTimestamp = '2020-08-05T13:56:56.938Z';

    test('calls CRM to update the test engine sent date of the booking product with the given id', async () => {
      await crm.updateBookingSyncDate(mockBookingProductId, mockTimestamp);

      expect(mockDynamicsWebApi.updateSingleProperty).toHaveBeenCalled();
    });

    test('errors if the call to CRM to update the sent date failed', async () => {
      mockDynamicsWebApi.updateSingleProperty.mockRejectedValue(mockError);

      await expect(crm.updateBookingSyncDate(mockBookingProductId, mockTimestamp)).rejects.toThrow(CrmError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'CRM::updateBookingSyncDate: 500 error updating booking product',
        {
          error: mockError,
          bookingProductId: mockBookingProductId,
        },
      );
    });
  });
});
