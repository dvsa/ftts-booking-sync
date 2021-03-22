import Container from 'typedi';

import { CRM } from '../../../../src/services/crm';
import { mockCRMBookingProducts } from '../../../stubs/crm';
import { mockBookings } from '../../../stubs/domain';
import { CrmError } from '../../../../src/errors';
import { CRMBookingProduct } from '../../../../src/interfaces/crm';

jest.mock('typedi');
jest.mock('@dvsa/cds-retry', () => ({
  cdsRetry: (fn: () => Promise<unknown>) => fn(),
}));

const mockError = {
  message: 'Error message',
  status: 500,
  toString: () => 'Mock Error',
};

describe('CRM client', () => {
  const mockDynamicsWebApi = {
    retrieveMultipleRequest: jest.fn(),
    updateSingleProperty: jest.fn(),
    count: jest.fn(),
  };

  const mockLogger = {
    warn: jest.fn(),
    critical: jest.fn(),
    debug: jest.fn(),
    logCrmEvent: jest.fn(),
    error: jest.fn(),
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
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: mockCRMBookingProducts,
      });

      const result = await crm.getNewBookings();

      expect(result).toStrictEqual(mockBookings);
    });

    test('logs and throws an error if the call to CRM fails', async () => {
      mockDynamicsWebApi.retrieveMultipleRequest.mockRejectedValue(mockError);

      await expect(crm.getNewBookings()).rejects.toThrow(CrmError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'CRM::getNewBookings: 500 error retrieving booking products matching the criteria',
        { error: 'Mock Error' },
      );
    });

    test('skips results it cannot map', async () => {
      const invalidCRMBookingProducts = JSON.parse(JSON.stringify(mockCRMBookingProducts)) as CRMBookingProduct[];
      delete invalidCRMBookingProducts[0].ftts_bookingid.ftts_testcentre;
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: invalidCRMBookingProducts,
      });

      const result = await crm.getNewBookings();

      expect(result).not.toContain(mockBookings[0]);
      for (let i = 1; i < mockBookings.length; i++) {
        expect(result).toContainEqual(mockBookings[1]);
      }
      expect(mockLogger.critical).toHaveBeenCalledWith('Error retrieving booking details from CRM booking product response', {
        bookingProductId: invalidCRMBookingProducts[0].ftts_bookingproductid,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.any(TypeError),
      });
    });
  });

  describe('getCancelledBookings', () => {
    test('calls CRM to get cancelled bookings', async () => {
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: [
          { ftts_bookingproductid: '001', ftts_reference: 'ref1' },
          { ftts_bookingproductid: '002', ftts_reference: 'ref2' },
        ],
      });

      const result = await crm.getCancelledBookings();

      expect(result).toStrictEqual([
        { id: '001', reference: 'ref1' },
        { id: '002', reference: 'ref2' },
      ]);
    });

    test('logs and throws an error if the call to CRM fails', async () => {
      mockDynamicsWebApi.retrieveMultipleRequest.mockRejectedValue(mockError);

      await expect(crm.getCancelledBookings()).rejects.toThrow(CrmError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'CRM::getCancelledBookings: 500 error retrieving booking products matching the criteria',
        { error: 'Mock Error' },
      );
    });
  });

  describe('getUpdatedBookings', () => {
    test('calls CRM to get updated bookings', async () => {
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
        { error: 'Mock Error' },
      );
    });

    test('skips results it cannot map', async () => {
      const invalidCRMBookingProducts = JSON.parse(JSON.stringify(mockCRMBookingProducts)) as CRMBookingProduct[];
      delete invalidCRMBookingProducts[0].ftts_bookingid.ftts_testcentre;
      mockDynamicsWebApi.retrieveMultipleRequest.mockResolvedValue({
        value: invalidCRMBookingProducts,
      });

      const result = await crm.getUpdatedBookings();

      expect(result).not.toContain(mockBookings[0]);
      for (let i = 1; i < mockBookings.length; i++) {
        expect(result).toContainEqual(mockBookings[1]);
      }
      expect(mockLogger.critical).toHaveBeenCalledWith('Error retrieving booking details from CRM booking product response', {
        bookingProductId: invalidCRMBookingProducts[0].ftts_bookingproductid,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.any(TypeError),
      });
    });
  });

  describe('candidateHasValidTestPass', () => {
    test('calls CRM to check if the candidate has a valid test pass for the given test type on the given date', async () => {
      mockDynamicsWebApi.count.mockResolvedValue(1);

      const result = await crm.candidateHasValidTestPass('123', 3, '2020-09-12');

      expect(result).toStrictEqual(true);
    });

    test('returns false if the candidate does not have a valid test pass', async () => {
      mockDynamicsWebApi.count.mockResolvedValue(0);

      const result = await crm.candidateHasValidTestPass('123', 3, '2020-09-12');

      expect(result).toStrictEqual(false);
    });

    test('logs and returns false if the call to CRM fails', async () => {
      mockDynamicsWebApi.count.mockRejectedValue(new Error());

      const result = await crm.candidateHasValidTestPass('123', 3, '2020-09-12');

      expect(result).toStrictEqual(false);
      expect(mockLogger.critical).toHaveBeenCalled();
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
          error: 'Mock Error',
          bookingProductId: mockBookingProductId,
        },
      );
    });
  });
});
