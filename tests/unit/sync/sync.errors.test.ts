import { Synchroniser } from '../../../src/sync/sync';
import {
  SarasError, SarasDuplicateError, CrmError, SarasAppointmentNotFoundError,
} from '../../../src/errors';
import { mockBookings } from '../../stubs/domain';
import { CRM } from '../../../src/services/crm';
import { SARAS } from '../../../src/services/saras';
import { Logger } from '../../../src/libraries/logger';

jest.mock('typedi');

describe('Booking synchroniser - error handling', () => {
  const mockCRM = {
    getNewBookings: jest.fn(),
    getCancelledBookings: jest.fn(),
    getUpdatedBookings: jest.fn(),
    updateBookingSyncDate: jest.fn(),
    candidateHasValidTestPass: jest.fn(),
    getLastPassedTestDate: jest.fn(),
  };

  const mockSARAS = {
    createBooking: jest.fn(),
    deleteBooking: jest.fn(),
    updateBooking: jest.fn(),
  };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    critical: jest.fn(),
  };

  const mockSyncTimestamp = '2021-04-05T14:30:00.000Z';

  const sync = new Synchroniser(
    mockSyncTimestamp,
    mockCRM as any as CRM,
    mockSARAS as any as SARAS,
    mockLogger as any as Logger,
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
        mockCRM.candidateHasValidTestPass.mockResolvedValue(true);
      });

      describe('if the CRM call to getNewBookings fails', () => {
        describe('with a CrmError with status code 400 or 500', () => {
          test.each([
            [400, '400'],
            [500, '500'],
          ])('swallows the %s error to continue the run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.getNewBookings.mockRejectedValueOnce(mockCrmError);

            await sync.processBookings();

            expect(mockCRM.getCancelledBookings).toHaveBeenCalled();
            expect(mockCRM.getUpdatedBookings).toHaveBeenCalled();
          });
        });

        describe('with any other status code', () => {
          test.each([
            [401, '401'],
            [403, '403'],
            [404, '404'],
            [undefined, 'Unknown'],
          ])('rethrows the %s error to abort the whole run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.getNewBookings.mockRejectedValueOnce(mockCrmError);

            await expect(sync.processBookings()).rejects.toThrow(mockCrmError);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockCRM.getNewBookings.mockRejectedValueOnce(mockUnexpectedError);

            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
          });
        });
      });

      describe('if one of the SARAS create booking operations fails', () => {
        describe('with a SarasError', () => {
          test('swallows the error and skips to the next booking', async () => {
            const mockSarasError = new SarasError('Create booking failed');
            mockSARAS.createBooking.mockRejectedValueOnce(mockSarasError); // Fail on first booking

            await sync.processBookings();

            expect(mockCRM.updateBookingSyncDate).not.toHaveBeenCalledWith('001', mockSyncTimestamp);
            expect(mockSARAS.createBooking).toHaveBeenCalledWith(mockBookings[1]);
          });
        });

        describe('with a SarasDuplicateError', () => {
          test('updates the CRM booking sync date again', async () => {
            const mockSarasDuplicateError = new SarasDuplicateError('Booking already exists');
            mockSARAS.createBooking.mockRejectedValueOnce(mockSarasDuplicateError);

            await sync.processBookings();

            expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('001', mockSyncTimestamp);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockSARAS.createBooking.mockRejectedValueOnce(mockUnexpectedError);

            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
            expect(mockCRM.updateBookingSyncDate).not.toHaveBeenCalled();
          });
        });
      });

      describe('if one of the CRM updates fails', () => {
        describe('with a CrmError with status code 400 or 500', () => {
          test.each([
            [400, '400'],
            [500, '500'],
          ])('swallows the %s error to continue the run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.updateBookingSyncDate.mockRejectedValueOnce(mockCrmError); // Fail on first booking

            await sync.processBookings();

            expect(mockSARAS.createBooking).toHaveBeenCalledWith(mockBookings[0]);
            expect(mockSARAS.createBooking).toHaveBeenCalledWith(mockBookings[1]); // Continues to second booking
          });
        });

        describe('with any other status code', () => {
          test.each([
            [401, '401'],
            [403, '403'],
            [404, '404'],
            [undefined, 'Unknown'],
          ])('rethrows the %s error to abort the whole run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.updateBookingSyncDate.mockRejectedValueOnce(mockCrmError);

            await expect(sync.processBookings()).rejects.toThrow(mockCrmError);
            expect(mockSARAS.createBooking).toHaveBeenCalledTimes(1);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockCRM.updateBookingSyncDate.mockRejectedValueOnce(mockUnexpectedError);

            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
            expect(mockSARAS.createBooking).toHaveBeenCalledTimes(1);
          });
        });
      });
    });

    describe('cancelled bookings', () => {
      beforeEach(() => {
        mockCRM.getNewBookings.mockResolvedValue([]);
        mockCRM.getCancelledBookings.mockResolvedValue(mockBookings);
        mockCRM.getUpdatedBookings.mockResolvedValue([]);
        mockCRM.candidateHasValidTestPass.mockResolvedValue(true);
      });

      describe('if the CRM call to getCancelledBookings fails', () => {
        describe('with a CrmError with status code 400 or 500', () => {
          test.each([
            [400, '400'],
            [500, '500'],
          ])('swallows the %s error to continue the run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.getCancelledBookings.mockRejectedValueOnce(mockCrmError);

            await sync.processBookings();

            expect(mockCRM.getUpdatedBookings).toHaveBeenCalled();
          });
        });

        describe('with any other status code', () => {
          test.each([
            [401, '401'],
            [403, '403'],
            [404, '404'],
            [undefined, 'Unknown'],
          ])('rethrows the %s error to abort the whole run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.getCancelledBookings.mockRejectedValueOnce(mockCrmError);

            await expect(sync.processBookings()).rejects.toThrow(mockCrmError);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockCRM.getCancelledBookings.mockRejectedValueOnce(mockUnexpectedError);

            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
          });
        });
      });

      describe('if one of the SARAS delete booking operations fails', () => {
        describe('with a SarasError', () => {
          test('swallows the error and skips to the next booking', async () => {
            const mockSarasError = new SarasError('Delete booking failed');
            mockSARAS.deleteBooking.mockRejectedValueOnce(mockSarasError); // Fail on first booking

            await sync.processBookings();

            expect(mockCRM.updateBookingSyncDate).not.toHaveBeenCalledWith('001', mockSyncTimestamp);
            expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('002', mockSyncTimestamp);
          });
        });

        describe('with a SarasAppointmentNotFoundError', () => {
          test('updates the CRM booking sync date again', async () => {
            const mockSarasAppointmentNotFoundError = new SarasAppointmentNotFoundError('Appointment not found');
            mockSARAS.createBooking.mockRejectedValueOnce(mockSarasAppointmentNotFoundError);

            await sync.processBookings();

            expect(mockCRM.updateBookingSyncDate).toHaveBeenCalledWith('001', mockSyncTimestamp);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockSARAS.deleteBooking.mockRejectedValueOnce(mockUnexpectedError);

            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
            expect(mockCRM.updateBookingSyncDate).not.toHaveBeenCalled();
          });
        });
      });

      describe('if one of the CRM updates fails', () => {
        describe('with a CrmError with status code 400 or 500', () => {
          test.each([
            [400, '400'],
            [500, '500'],
          ])('swallows the %s error to continue the run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.updateBookingSyncDate.mockRejectedValueOnce(mockCrmError); // Fail on first booking

            await sync.processBookings();

            expect(mockSARAS.deleteBooking).toHaveBeenCalledWith(mockBookings[0]);
            expect(mockSARAS.deleteBooking).toHaveBeenCalledWith(mockBookings[1]); // Continues to second booking
          });
        });

        describe('with any other status code', () => {
          test.each([
            [401, '401'],
            [403, '403'],
            [404, '404'],
            [undefined, 'Unknown'],
          ])('rethrows the %s error to abort the whole run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.updateBookingSyncDate.mockRejectedValueOnce(mockCrmError);

            await expect(sync.processBookings()).rejects.toThrow(mockCrmError);
            expect(mockSARAS.deleteBooking).toHaveBeenCalledTimes(1);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockCRM.updateBookingSyncDate.mockRejectedValueOnce(mockUnexpectedError);

            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
            expect(mockSARAS.deleteBooking).toHaveBeenCalledTimes(1);
          });
        });
      });
    });

    describe('updated bookings', () => {
      beforeEach(() => {
        mockCRM.getNewBookings.mockResolvedValue([]);
        mockCRM.getCancelledBookings.mockResolvedValue([]);
        mockCRM.getUpdatedBookings.mockResolvedValue(mockBookings);
      });

      describe('if the CRM call to getUpdatedBookings fails', () => {
        describe('with a CrmError with status code 400 or 500', () => {
          test.each([
            [400, '400'],
            [500, '500'],
          ])('swallows the %s error to continue the run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.getUpdatedBookings.mockRejectedValueOnce(mockCrmError);
            await sync.processBookings();
            expect(mockCRM.getNewBookings).toHaveBeenCalled();
            expect(mockCRM.getCancelledBookings).toHaveBeenCalled();
          });
        });

        describe('with any other status code', () => {
          test.each([
            [401, '401'],
            [403, '403'],
            [404, '404'],
            [undefined, 'Unknown'],
          ])('rethrows the %s error to abort the whole run', async (status, message) => {
            const mockCrmError = new CrmError(message, status);
            mockCRM.getUpdatedBookings.mockRejectedValueOnce(mockCrmError);
            await expect(sync.processBookings()).rejects.toThrow(mockCrmError);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockCRM.getUpdatedBookings.mockRejectedValueOnce(mockUnexpectedError);
            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
          });
        });
      });

      describe('if one of the SARAS update booking operations fails', () => {
        describe('with a SarasError', () => {
          test('swallows the error and skips to the next booking', async () => {
            const mockSarasError = new SarasError('Update booking failed');
            mockSARAS.updateBooking.mockRejectedValueOnce(mockSarasError); // Fail on first booking
            await sync.processBookings();
            expect(mockCRM.updateBookingSyncDate).not.toHaveBeenCalledWith('001', mockSyncTimestamp);
            expect(mockSARAS.updateBooking).toHaveBeenCalledWith(mockBookings[1]);
          });
        });

        describe('with some other unexpected error', () => {
          test('rethrows the error to abort the whole run', async () => {
            const mockUnexpectedError = new Error('Unexpected error');
            mockSARAS.updateBooking.mockRejectedValueOnce(mockUnexpectedError);
            await expect(sync.processBookings()).rejects.toThrow(mockUnexpectedError);
            expect(mockCRM.updateBookingSyncDate).not.toHaveBeenCalled();
          });
        });
      });
    });
  });
});
