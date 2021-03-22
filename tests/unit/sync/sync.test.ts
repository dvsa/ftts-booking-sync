import { when } from 'jest-when';
import Container from 'typedi';

import { Synchroniser } from '../../../src/sync/sync';
import { mockBookings, buildMockBookingDetails } from '../../stubs/domain';
import { TestType } from '../../../src/enum/crm';

jest.mock('typedi');

describe('Booking synchroniser - happy path', () => {
  const mockCRM = {
    getNewBookings: jest.fn(),
    getCancelledBookings: jest.fn(),
    getUpdatedBookings: jest.fn(),
    candidateHasValidTestPass: jest.fn(),
    updateBookingSyncDate: jest.fn(),
  };

  const mockSARAS = {
    createBooking: jest.fn(),
    deleteBooking: jest.fn(),
    updateBooking: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
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
      });
    });

    describe('cancelled bookings', () => {
      const mockBookingRefs = [
        { id: '001', reference: 'ref1' },
        { id: '002', reference: 'ref2' },
      ];

      beforeEach(() => {
        mockCRM.getNewBookings.mockResolvedValue([]);
        mockCRM.getUpdatedBookings.mockResolvedValue([]);
        mockCRM.getCancelledBookings.mockResolvedValue(mockBookingRefs);
      });

      test('gets cancelled bookings from CRM, sends each to SARAS and updates CRM', async () => {
        when(mockSARAS.deleteBooking).calledWith(mockBookingRefs[0]).mockResolvedValue(undefined);
        when(mockSARAS.deleteBooking).calledWith(mockBookingRefs[1]).mockResolvedValue(undefined);

        await sync.processBookings();

        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('001', mockSyncTimestamp);
        expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('002', mockSyncTimestamp);
      });
    });
  });
});
