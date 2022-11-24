import { when } from 'jest-when';
import Container from 'typedi';

import { Synchroniser } from '../../../src/sync/sync';
import { mockBookings, buildMockBookingDetails } from '../../stubs/domain';
import { TestType } from '../../../src/enum/crm';
import { config } from '../../../src/config';

jest.mock('typedi');
jest.mock('../../../src/config', () => ({
  config: {
    featureToggles: {
      enableSarasApiVersion2: false,
    },
  },
}));

describe('Booking synchroniser - happy path', () => {
  const mockCRM = {
    getNewBookings: jest.fn(),
    getCancelledBookings: jest.fn(),
    getUpdatedBookings: jest.fn(),
    candidateHasValidTestPass: jest.fn(),
    updateBookingSyncDate: jest.fn(),
    getLastPassedTestDate: jest.fn(),
  };

  const mockSARAS = {
    createBooking: jest.fn(),
    deleteBooking: jest.fn(),
    updateBooking: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    critical: jest.fn(),
  };

  Container.get = jest.fn((library: string) => {
    const stored = {
      'crm:client': mockCRM,
      logger: mockLogger,
      'saras:client': mockSARAS,
    };
    return stored[library] as unknown;
  }) as jest.Mock;

  const mockSyncTimestamp = '2021-04-05T14:30:00.000Z';
  const mockLastPassedTestDate = '2021-12-23T14:48:00.000Z';

  const sync = new Synchroniser(
    mockSyncTimestamp,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processBookings', () => {
    describe('new bookings', () => {
      beforeEach(() => {
        mockCRM.getNewBookings.mockResolvedValue(mockBookings);
        mockCRM.getCancelledBookings.mockResolvedValue([]);
        mockCRM.getUpdatedBookings.mockResolvedValue([]);
        mockCRM.candidateHasValidTestPass.mockResolvedValue(false);
        mockCRM.getLastPassedTestDate.mockResolvedValue(null);
        config.featureToggles.enableSarasApiVersion2 = false;
      });

      test('gets new bookings from CRM, sends each to SARAS and updates CRM', async () => {
        when(mockSARAS.createBooking).calledWith(mockBookings[0]).mockResolvedValue(undefined);
        when(mockSARAS.createBooking).calledWith(mockBookings[1]).mockResolvedValue(undefined);

        await sync.processBookings();

        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('001', mockSyncTimestamp);
        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('002', mockSyncTimestamp);
      });

      describe('if the booking is for an LGV or PCV test', () => {
        let mockBooking;
        beforeEach(() => {
          mockBooking = buildMockBookingDetails();
          mockBooking.product.testType = TestType.LGV_HPT;
          mockCRM.getNewBookings.mockResolvedValue([mockBooking]);
        });

        test('populates the booking test history if the candidate has a valid corresponding test pass', async () => {
          mockCRM.candidateHasValidTestPass.mockResolvedValue(true);

          await sync.processBookings();

          expect(mockSARAS.createBooking).toHaveBeenCalledWith({ ...mockBooking, testHistory: [TestType.LGV_MULTIPLE_CHOICE] });
        });

        test('does not populate the booking test history if the candidate does not have a valid corresponding test pass', async () => {
          mockCRM.candidateHasValidTestPass.mockResolvedValue(false);

          await sync.processBookings();

          expect(mockSARAS.createBooking).toHaveBeenCalledWith(mockBooking);
        });

        test('populates the booking test history and test last passed date (when toggle is on) if the candidate has a valid corresponding test pass', async () => {
          config.featureToggles.enableSarasApiVersion2 = true;
          mockCRM.getLastPassedTestDate.mockResolvedValue(mockLastPassedTestDate);

          await sync.processBookings();

          expect(mockSARAS.createBooking).toHaveBeenCalledWith({ ...mockBooking, testHistory: [TestType.LGV_MULTIPLE_CHOICE], testLastPassedDate: mockLastPassedTestDate });
        });

        test('does not populate the booking test history and test last passed date if the candidate does not have a valid corresponding test pass', async () => {
          config.featureToggles.enableSarasApiVersion2 = true;
          mockCRM.getLastPassedTestDate.mockResolvedValue(undefined);

          await sync.processBookings();

          expect(mockSARAS.createBooking).toHaveBeenCalledWith(mockBooking);
        });

        test('does not populate the test last passed date if the corresponding toggle is off', async () => {
          mockCRM.getLastPassedTestDate.mockResolvedValue(mockLastPassedTestDate);
          mockCRM.candidateHasValidTestPass.mockResolvedValue(true);

          await sync.processBookings();

          expect(mockSARAS.createBooking).toHaveBeenCalledWith({ ...mockBooking, testHistory: [TestType.LGV_MULTIPLE_CHOICE] });
        });
      });
    });

    describe('updated bookings', () => {
      beforeEach(() => {
        mockCRM.getNewBookings.mockResolvedValue([]);
        mockCRM.getCancelledBookings.mockResolvedValue([]);
        mockCRM.getUpdatedBookings.mockResolvedValue(mockBookings);
        mockCRM.candidateHasValidTestPass.mockResolvedValue(false);
      });

      test('gets updated bookings from CRM, sends each to SARAS and updates CRM', async () => {
        when(mockSARAS.updateBooking).calledWith(mockBookings[0]).mockResolvedValue(undefined);
        when(mockSARAS.updateBooking).calledWith(mockBookings[1]).mockResolvedValue(undefined);

        await sync.processBookings();

        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('001', mockSyncTimestamp);
        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('002', mockSyncTimestamp);
      });

      describe('if the booking is for an LGV or PCV test', () => {
        let mockBooking;
        beforeEach(() => {
          mockBooking = buildMockBookingDetails();
          mockBooking.product.testType = TestType.PCV_MULTIPLE_CHOICE;
          mockCRM.getUpdatedBookings.mockResolvedValue([mockBooking]);
        });

        test('populates the booking test history if the candidate has a valid corresponding test pass', async () => {
          mockCRM.candidateHasValidTestPass.mockResolvedValue(true);

          await sync.processBookings();

          expect(mockSARAS.updateBooking).toHaveBeenCalledWith({ ...mockBooking, testHistory: [TestType.PCV_HPT] });
        });

        test('does not populate the booking test history if the candidate does not have a valid corresponding test pass', async () => {
          mockCRM.candidateHasValidTestPass.mockResolvedValue(false);

          await sync.processBookings();

          expect(mockSARAS.updateBooking).toHaveBeenCalledWith(mockBooking);
        });

        test('populates the booking test history and test last passed date (when toggle is on) if the candidate has a valid corresponding test pass', async () => {
          config.featureToggles.enableSarasApiVersion2 = true;
          mockCRM.getLastPassedTestDate.mockResolvedValue(mockLastPassedTestDate);

          await sync.processBookings();

          expect(mockSARAS.updateBooking).toHaveBeenCalledWith({ ...mockBooking, testHistory: [TestType.PCV_HPT], testLastPassedDate: mockLastPassedTestDate });
        });

        test('does not populate the booking test history and test last passed date if the candidate does not have a valid corresponding test pass', async () => {
          config.featureToggles.enableSarasApiVersion2 = true;
          mockCRM.getLastPassedTestDate.mockResolvedValue(undefined);

          await sync.processBookings();

          expect(mockSARAS.updateBooking).toHaveBeenCalledWith(mockBooking);
        });

        test('does not populate the test last passed date if the corresponding toggle is off', async () => {
          mockCRM.getLastPassedTestDate.mockResolvedValue(mockLastPassedTestDate);
          mockCRM.candidateHasValidTestPass.mockResolvedValue(true);

          await sync.processBookings();

          expect(mockSARAS.updateBooking).toHaveBeenCalledWith({ ...mockBooking, testHistory: [TestType.PCV_HPT] });
        });
      });
    });

    describe('cancelled bookings', () => {
      beforeEach(() => {
        mockCRM.getNewBookings.mockResolvedValue([]);
        mockCRM.getUpdatedBookings.mockResolvedValue([]);
        mockCRM.getCancelledBookings.mockResolvedValue(mockBookings);
      });

      test('gets cancelled bookings from CRM, sends each to SARAS and updates CRM', async () => {
        when(mockSARAS.deleteBooking).calledWith(mockBookings[0]).mockResolvedValue(undefined);
        when(mockSARAS.deleteBooking).calledWith(mockBookings[1]).mockResolvedValue(undefined);

        await sync.processBookings();

        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('001', mockSyncTimestamp);
        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('002', mockSyncTimestamp);
      });
    });
  });
});
