import Container from 'typedi';
import { AxiosError } from 'axios';

import { config } from '../../config';
import { BusinessTelemetry, getIdentifiers, Logger } from '../../libraries/logger';
import { rethrowIfEgressFilteringError } from '../../libraries/egress-filter';
import { SarasError, SarasAppointmentNotFoundError } from '../../errors';
import { BookingDetails } from '../../interfaces/domain';
import { mapAndConvertBookingDetailsToSARAS, removeNullsAndUndefined } from '../../utils/converters';
import { SARASAxiosError } from '../../interfaces/saras';
import { SarasAxios } from './axios-instance';

class SARAS {
  constructor(
    private axiosInstance: SarasAxios = Container.get('sarasAxiosInstance'),
    private logger: Logger = Container.get('logger'),
  ) { }

  public async createBooking(booking: BookingDetails): Promise<void> {
    const bookingProductId = booking.bookingProduct.id;
    const appointmentId = booking.bookingProduct.reference;
    const sarasBooking = removeNullsAndUndefined(mapAndConvertBookingDetailsToSARAS(booking));

    this.logger.info(`SARAS::createBooking: Posting booking ${appointmentId} to SARAS`, {
      appointmentId,
      bookingProductId,
    });
    this.logger.debug(`SARAS::createBooking: raw payload for booking ${appointmentId}`, {
      appointmentId,
      bookingProductId,
      payload: sarasBooking,
    });

    const url = `${config.saras.apiUrl}Booking/${appointmentId}`;
    try {
      await this.axiosInstance.post(url, sarasBooking);
      this.logger.event(BusinessTelemetry.CBS_TE_SUCC_CREATE, `SARAS::createBooking: Successfully posted booking ${appointmentId} to SARAS`, {
        ...getIdentifiers(booking),
      });
    } catch (e) {
      rethrowIfEgressFilteringError(e);

      const err = e as AxiosError;
      const sarasError = SarasError.fromAxiosResponse(err as SARASAxiosError);

      this.logger.debug(`SARAS::createBooking: error response posting booking ${appointmentId}`, {
        appointmentId,
        bookingProductId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        response: err.response?.data,
      });
      this.logger.critical(`SARAS::createBooking: ${sarasError.status ?? 'Unknown'} error posting booking ${appointmentId}`, {
        appointmentId,
        bookingProductId,
        error: err.toString(),
        code: sarasError.code,
        reason: sarasError.reason,
      });
      this.logger.logSarasEvent(sarasError.status, {
        appointmentId,
        bookingProductId,
      });

      throw sarasError;
    }
  }

  public async deleteBooking(booking: BookingDetails): Promise<void> {
    const bookingProductId = booking?.bookingProduct?.id;
    const appointmentId = booking?.bookingProduct?.reference;

    this.logger.info(`SARAS::deleteBooking: Deleting booking ${appointmentId} in SARAS`, {
      appointmentId,
      bookingProductId,
    });

    const url = `${config.saras.apiUrl}Booking/${appointmentId}`;
    try {
      await this.axiosInstance.delete(url);
      this.logger.event(BusinessTelemetry.CBS_TE_SUCC_DELETE, `SARAS::deleteBooking: Successfully sent deleted booking ${appointmentId} to SARAS`, {
        ...getIdentifiers(booking),
      });
    } catch (e) {
      rethrowIfEgressFilteringError(e);

      const err = e as AxiosError;
      const sarasError = SarasError.fromAxiosResponse(err as SARASAxiosError);

      this.logger.debug(`SARAS::deleteBooking: error response deleting booking ${appointmentId}`, {
        appointmentId,
        bookingProductId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        response: err.response?.data,
      });
      this.logger.critical(`SARAS::deleteBooking: ${sarasError.status ?? 'Unknown'} error deleting booking ${appointmentId}`, {
        appointmentId,
        bookingProductId,
        error: err.toString(),
        code: sarasError.code,
        reason: sarasError.reason,
      });
      this.logger.logSarasEvent(sarasError.status, {
        appointmentId,
        bookingProductId,
      });

      throw sarasError;
    }
  }

  public async updateBooking(booking: BookingDetails): Promise<void> {
    const bookingProductId = booking.bookingProduct.id;
    const appointmentId = booking.bookingProduct.reference;
    const sarasBooking = removeNullsAndUndefined(mapAndConvertBookingDetailsToSARAS(booking));

    this.logger.info(`SARAS::updateBooking: Sending updated booking ${appointmentId} to SARAS`, {
      appointmentId,
      bookingProductId,
    });
    this.logger.debug(`SARAS::updateBooking: raw payload for booking ${appointmentId}`, {
      appointmentId,
      bookingProductId,
      payload: sarasBooking,
    });

    const url = `${config.saras.apiUrl}Booking/${appointmentId}`;
    try {
      await this.axiosInstance.put(url, sarasBooking);
      this.logger.event(BusinessTelemetry.CBS_TE_SUCC_UPDATE, `SARAS::updateBooking: Successfully sent updated booking ${appointmentId} to SARAS`, {
        ...getIdentifiers(booking),
      });
    } catch (e) {
      rethrowIfEgressFilteringError(e);

      const err = e as AxiosError;
      const sarasError = SarasError.fromAxiosResponse(err as SARASAxiosError);

      this.logger.debug(`SARAS::updateBooking: error response updating booking ${appointmentId}`, {
        appointmentId,
        bookingProductId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        response: err.response?.data,
      });
      this.logger.critical(`SARAS::updateBooking: ${sarasError.status ?? 'Unknown'} error sending updated booking ${appointmentId}`, {
        appointmentId,
        bookingProductId,
        error: err.toString(),
        code: sarasError.code,
        reason: sarasError.reason,
      });
      this.logger.logSarasEvent(sarasError.status, {
        appointmentId,
        bookingProductId,
      });

      if (sarasError instanceof SarasAppointmentNotFoundError) {
        this.logger.warn(`SARAS::updateBooking: Booking ${appointmentId} not found in SARAS - posting missing booking`, {
          appointmentId,
          bookingProductId,
          error: sarasError,
        });
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
