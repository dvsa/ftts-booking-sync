import { buildMockBookingDetails, mockBookings } from '../../../stubs/domain';
import { SARAS } from '../../../../src/services/saras';
import { SarasError, SarasDuplicateError } from '../../../../src/errors';
import { mapAndConvertBookingDetailsToSARAS } from '../../../../src/utils/converters';

jest.mock('typedi');

describe('SARAS', () => {
  const mockBookingDetails = mockBookings[0];

  const mockAxiosInstance = {
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    critical: jest.fn(),
    debug: jest.fn(),
    logSarasEvent: jest.fn(),
    context: {},
  };

  const saras = new SARAS(mockAxiosInstance as any, mockLogger as any);

  const mockSarasErrorResponse = {
    toString: () => 'mockSarasError',
    response: {
      status: 500,
      data: {
        reason: 'Something went wrong',
        code: 1011,
      },
    },
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createBooking', () => {
    test('calls SARAS to post a converted booking', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await saras.createBooking(mockBookingDetails);

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SARAS::createBooking: Posting new booking to SARAS',
        {
          appointmentId: mockBookingDetails.bookingProduct.reference,
          bookingProductId: mockBookingDetails.bookingProduct.id,
        },
      );
    });

    test('calls to SARAS do not have null and undefined data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });
      const booking = buildMockBookingDetails();
      booking.testHistory = null;
      booking.bookingProduct.testDate = undefined;
      const mappedBooking = mapAndConvertBookingDetailsToSARAS(booking);
      const deletedFieldsBooking = mapAndConvertBookingDetailsToSARAS(buildMockBookingDetails());
      delete deletedFieldsBooking.Appointment.DateTime;
      delete deletedFieldsBooking.PreviousPassedExams;

      await saras.createBooking(booking);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(expect.any(String), { ...deletedFieldsBooking, Appointment: {} });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockAxiosInstance.post.mock.calls[0][1]).not.toStrictEqual(mappedBooking);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockAxiosInstance.post.mock.calls[0][1]).toStrictEqual(deletedFieldsBooking);
    });

    test('throws a SarasError if the request fails', async () => {
      mockAxiosInstance.post.mockRejectedValue(mockSarasErrorResponse);

      await expect(saras.createBooking(mockBookingDetails)).rejects.toThrow(SarasError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'SARAS::createBooking: 500 error posting new booking',
        {
          appointmentId: mockBookingDetails.bookingProduct.reference,
          bookingProductId: mockBookingDetails.bookingProduct.id,
          error: 'mockSarasError',
          reason: 'Something went wrong',
          code: 1011,
        },
      );
      expect(mockLogger.logSarasEvent).toHaveBeenCalledWith(500);
    });

    test('throws a SarasDuplicateError if the request fails due to a duplicate being sent', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            code: 1025,
            reason: 'Appointment already exists',
          },
        },
      });

      await expect(saras.createBooking(mockBookingDetails)).rejects.toThrow(SarasDuplicateError);
    });
  });

  describe('deleteBooking', () => {
    const mockBookingRef = {
      id: mockBookingDetails.bookingProduct.id,
      reference: mockBookingDetails.bookingProduct.reference,
    };

    test('calls SARAS and returns the booking id when successful', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ status: 200 });

      await saras.deleteBooking(mockBookingRef);

      expect(mockAxiosInstance.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SARAS::deleteBooking: Deleting booking in SARAS',
        {
          appointmentId: mockBookingDetails.bookingProduct.reference,
          bookingProductId: mockBookingDetails.bookingProduct.id,
        },
      );
    });

    test('throws a SarasError if the request fails', async () => {
      mockAxiosInstance.delete.mockRejectedValue(mockSarasErrorResponse);

      await expect(saras.deleteBooking(mockBookingRef)).rejects.toThrow(SarasError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'SARAS::deleteBooking: 500 error deleting booking',
        {
          appointmentId: mockBookingDetails.bookingProduct.reference,
          bookingProductId: mockBookingDetails.bookingProduct.id,
          error: 'mockSarasError',
          reason: 'Something went wrong',
          code: 1011,
        },
      );
      expect(mockLogger.logSarasEvent).toHaveBeenCalledWith(500);
    });
  });

  describe('updateBooking', () => {
    test('calls SARAS to put a converted booking', async () => {
      mockAxiosInstance.put.mockResolvedValue({ status: 200 });

      await saras.updateBooking(mockBookingDetails);

      expect(mockAxiosInstance.put).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SARAS::updateBooking: Sending updated booking to SARAS',
        {
          appointmentId: mockBookingDetails.bookingProduct.reference,
          bookingProductId: mockBookingDetails.bookingProduct.id,
        },
      );
    });

    test('calls to SARAS do not have null and undefined data', async () => {
      mockAxiosInstance.put.mockResolvedValue({ status: 200 });
      const booking = buildMockBookingDetails();
      booking.testHistory = null;
      booking.bookingProduct.testDate = undefined;
      const mappedBooking = mapAndConvertBookingDetailsToSARAS(booking);
      const deletedFieldsBooking = mapAndConvertBookingDetailsToSARAS(buildMockBookingDetails());
      delete deletedFieldsBooking.Appointment.DateTime;
      delete deletedFieldsBooking.PreviousPassedExams;

      await saras.updateBooking(booking);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(expect.any(String), { ...deletedFieldsBooking, Appointment: {} });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockAxiosInstance.put.mock.calls[0][1]).not.toStrictEqual(mappedBooking);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockAxiosInstance.put.mock.calls[0][1]).toStrictEqual(deletedFieldsBooking);
    });

    test('defers to createBooking if the call fails with 404', async () => {
      mockAxiosInstance.put.mockRejectedValueOnce({
        toString: () => 'mockSarasError',
        response: {
          data: { code: 1029 },
          status: 404,
        },
      });
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await saras.updateBooking(mockBookingDetails);

      expect(mockAxiosInstance.put).toHaveBeenCalled();
      expect(mockLogger.critical).toHaveBeenCalledWith('SARAS::updateBooking: 404 error sending updated booking', {
        appointmentId: 'REF001',
        bookingProductId: '001',
        error: 'mockSarasError',
        code: 1029,
      });
      expect(mockLogger.logSarasEvent).toHaveBeenCalledWith(404);
      expect(mockLogger.info).toHaveBeenCalledWith('SARAS::updateBooking: Creating missing booking in SARAS');
      expect(mockLogger.info).toHaveBeenCalledWith('SARAS::createBooking: Posting new booking to SARAS', {
        bookingProductId: '001',
        appointmentId: 'REF001',
      });
      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });

    test('throws an error if the call fails with not 404', async () => {
      mockAxiosInstance.put.mockRejectedValue(mockSarasErrorResponse);

      await expect(saras.updateBooking(mockBookingDetails)).rejects.toThrow(SarasError);
      expect(mockLogger.critical).toHaveBeenCalledWith(
        'SARAS::updateBooking: 500 error sending updated booking',
        {
          appointmentId: mockBookingDetails.bookingProduct.reference,
          bookingProductId: mockBookingDetails.bookingProduct.id,
          error: 'mockSarasError',
          reason: 'Something went wrong',
          code: 1011,
        },
      );
      expect(mockLogger.logSarasEvent).toHaveBeenCalledWith(500);
    });
  });
});
