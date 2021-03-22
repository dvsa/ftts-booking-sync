import Container from 'typedi';
import { AxiosInstance, AxiosError } from 'axios';

import { config } from '../../config';
import { Logger } from '../../libraries/logger';
import { rethrowIfEgressFilteringError } from '../../libraries/egress-filter';
import { SarasError, SarasAppointmentNotFoundError } from '../../errors';
import { BookingDetails, BookingReference } from '../../interfaces/domain';
import { mapAndConvertBookingDetailsToSARAS, removeNullsAndUndefined } from '../../utils/converters';

class SARAS {
  constructor(
    private axiosInstance: AxiosInstance = Container.get('sarasAxiosInstance'),
    private logger: Logger = Container.get('logger'),
  ) { }

  public async createBooking(booking: BookingDetails): Promise<void> {
    const bookingProductId = booking.bookingProduct.id;
    const appointmentId = booking.bookingProduct.reference;
    const sarasBooking = removeNullsAndUndefined(mapAndConvertBookingDetailsToSARAS(booking));

    this.logger.info('SARAS::createBooking: Posting new booking to SARAS', {
      appointmentId,
      bookingProductId,
    });

    // TODO FTT-5417 - Needs to be removed as it will log out sensitive personal information in prod
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    const replacer = (key: any, value: any) => (typeof value === 'undefined' ? null : value); // replaces undefined to nulls
    this.logger.debug('SARAS::createBooking: Posting new booking to SARAS Raw payload', {
      payload: JSON.stringify(sarasBooking, replacer),
    });

    const url = `${config.saras.apiUrl}Booking/${appointmentId}`;
    try {
      await this.axiosInstance.post(url, sarasBooking);
    } catch (e) {
      rethrowIfEgressFilteringError(e);

      const err = e as AxiosError;
      const sarasError = SarasError.fromAxiosResponse(err);

      this.logger.info(`SARAS error response body: ${JSON.stringify(err.response?.data)}`);
      this.logger.critical(`SARAS::createBooking: ${sarasError.status ?? 'Unknown'} error posting new booking`, {
        appointmentId,
        bookingProductId,
        error: err.toString(),
        code: sarasError.code,
        reason: sarasError.reason,
      });
      this.logger.logSarasEvent(sarasError.status);

      throw sarasError;
    }
  }

  public async deleteBooking(bookingRef: BookingReference): Promise<void> {
    const bookingProductId = bookingRef.id;
    const appointmentId = bookingRef.reference;

    this.logger.info('SARAS::deleteBooking: Deleting booking in SARAS', {
      appointmentId,
      bookingProductId,
    });

    const url = `${config.saras.apiUrl}Booking/${appointmentId}`;
    try {
      await this.axiosInstance.delete(url);
    } catch (e) {
      rethrowIfEgressFilteringError(e);

      const err = e as AxiosError;
      const sarasError = SarasError.fromAxiosResponse(err);

      this.logger.info(`SARAS error response body: ${JSON.stringify(err.response?.data)}`);
      this.logger.critical(`SARAS::deleteBooking: ${sarasError.status ?? 'Unknown'} error deleting booking`, {
        appointmentId,
        bookingProductId,
        error: err.toString(),
        code: sarasError.code,
        reason: sarasError.reason,
      });
      this.logger.logSarasEvent(sarasError.status);

      throw sarasError;
    }
  }

  public async updateBooking(booking: BookingDetails): Promise<void> {
    const bookingProductId = booking.bookingProduct.id;
    const appointmentId = booking.bookingProduct.reference;
    const sarasBooking = removeNullsAndUndefined(mapAndConvertBookingDetailsToSARAS(booking));

    this.logger.info('SARAS::updateBooking: Sending updated booking to SARAS', {
      appointmentId,
      bookingProductId,
    });

    // TODO FTT-5417 - Needs to be removed as it will log out sensitive personal information in prod
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    const replacer = (key: any, value: any) => (typeof value === 'undefined' ? null : value); // replaces undefined to nulls
    this.logger.debug('SARAS::updateBooking: Sending updated booking to SARAS Raw payload', {
      payload: JSON.stringify(sarasBooking, replacer),
    });

    const url = `${config.saras.apiUrl}Booking/${appointmentId}`;
    try {
      await this.axiosInstance.put(url, sarasBooking);
    } catch (e) {
      rethrowIfEgressFilteringError(e);

      const err = e as AxiosError;
      const sarasError = SarasError.fromAxiosResponse(err);

      this.logger.info(`SARAS error response body: ${JSON.stringify(err.response?.data)}`);
      this.logger.critical(`SARAS::updateBooking: ${sarasError.status ?? 'Unknown'} error sending updated booking`, {
        appointmentId,
        bookingProductId,
        error: err.toString(),
        code: sarasError.code,
        reason: sarasError.reason,
      });
      this.logger.logSarasEvent(sarasError.status);

      if (sarasError instanceof SarasAppointmentNotFoundError) {
        this.logger.info('SARAS::updateBooking: Creating missing booking in SARAS');
        await this.createBooking(booking);
        return;
      }

      throw sarasError;
    }
  }
}

export {
  SARAS,
};
