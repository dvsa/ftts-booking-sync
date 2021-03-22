/* eslint-disable no-restricted-syntax, no-await-in-loop */
import Container from 'typedi';
import { InternalAccessDeniedError } from '@dvsa/egress-filtering';

import { Logger } from '../libraries/logger';
import { SARAS } from '../services/saras';
import { CRM } from '../services/crm';
import {
  SarasError, CrmError, SarasDuplicateError, SarasAppointmentNotFoundError,
} from '../errors';
import { BookingDetails, BookingReference } from '../interfaces/domain';
import { LGV_PCV_TESTTYPE_COUNTERPARTS } from '../utils/mappings';
import { TestType } from '../enum/crm';

class Synchroniser {
  constructor(
    private syncTimestamp: string,
    private crm: CRM = Container.get('crm:client'),
    private saras: SARAS = Container.get('saras:client'),
    private logger: Logger = Container.get('logger'),
  ) { }

  /**
   * Process new, cancelled and updated bookings.
   * Must be processed one by one in case of certain error codes which should abort execution altogether.
   */
  public async processBookings(): Promise<void> {
    await this.processUpdatedBookings();
    await this.processCancelledBookings();
    await this.processNewBookings();
  }

  private async processNewBookings(): Promise<void> {
    let bookings: BookingDetails[] = [];
    try {
      bookings = await this.crm.getNewBookings();
    } catch (e) {
      this.handleError(e);
    }

    this.logger.info(`Synchroniser::processNewBookings: Successfully retrieved ${bookings.length} new bookings from CRM`);

    let successCount = 0;
    for (const booking of bookings) {
      if (LGV_PCV_TESTTYPE_COUNTERPARTS.has(booking.product?.testType)) {
        await this.setTestHistory(booking);
      }
      try {
        await this.saras.createBooking(booking);
        await this.crm.updateBookingSyncDate(booking.bookingProduct.id, this.syncTimestamp);
        successCount++;
      } catch (e) {
        if (e instanceof SarasDuplicateError) {
          this.logger.warn('Booking duplicated/already sent to SARAS, updating CRM sync date', {
            bookingProductId: booking.bookingProduct.id,
            bookingReference: booking.bookingProduct.reference,
          });
          await this.tryUpdatingCrmAgain(booking.bookingProduct.id);
        } else {
          this.handleError(e);
        }
      }
    }

    this.logger.info(`Synchroniser::processNewBookings: Successfully processed ${successCount} new bookings`);
  }

  private async processCancelledBookings(): Promise<void> {
    let bookingRefs: BookingReference[] = [];
    try {
      bookingRefs = await this.crm.getCancelledBookings();
    } catch (e) {
      this.handleError(e);
    }

    this.logger.info(`Synchroniser::processCancelledBookings: Successfully retrieved ${bookingRefs.length} new cancellations from CRM`);

    let successCount = 0;
    for (const bookingRef of bookingRefs) {
      try {
        await this.saras.deleteBooking(bookingRef);
        await this.crm.updateBookingSyncDate(bookingRef.id, this.syncTimestamp);
        successCount++;
      } catch (e) {
        if (e instanceof SarasAppointmentNotFoundError) {
          this.logger.warn('Booking not found/already deleted in SARAS, updating CRM sync date', {
            bookingProductId: bookingRef.id,
            bookingReference: bookingRef.reference,
          });
          await this.tryUpdatingCrmAgain(bookingRef.id);
        } else {
          this.handleError(e);
        }
      }
    }

    this.logger.info(`Synchroniser::processCancelledBookings: Successfully processed ${successCount} cancellations`);
  }

  private async tryUpdatingCrmAgain(bookingProductId: string): Promise<void> {
    try {
      await this.crm.updateBookingSyncDate(bookingProductId, this.syncTimestamp);
    } catch (e) {
      this.handleError(e);
    }
  }

  private async processUpdatedBookings(): Promise<void> {
    let bookings: BookingDetails[] = [];

    try {
      bookings = await this.crm.getUpdatedBookings();
    } catch (e) {
      this.handleError(e);
    }

    this.logger.info(`Synchroniser::processUpdatedBookings: Successfully retrieved ${bookings.length} updated bookings from CRM`);

    let successCount = 0;
    for (const booking of bookings) {
      if (LGV_PCV_TESTTYPE_COUNTERPARTS.has(booking.product?.testType)) {
        await this.setTestHistory(booking);
      }

      try {
        await this.saras.updateBooking(booking);
        await this.crm.updateBookingSyncDate(booking.bookingProduct.id, this.syncTimestamp);
        successCount++;
      } catch (e) {
        this.handleError(e);
      }
    }

    this.logger.info(`Synchroniser::processUpdatedBookings: Successfully pushed ${successCount} updated bookings to SARAS`);
  }

  private async setTestHistory(booking: BookingDetails): Promise<void> {
    const contactId = booking.contact.id;
    const { testDate } = booking.bookingProduct;
    const correspondingTestType = LGV_PCV_TESTTYPE_COUNTERPARTS.get(booking.product.testType) as TestType;
    const hasPassedCorrespondingTest = await this.crm.candidateHasValidTestPass(contactId, correspondingTestType, testDate);
    if (hasPassedCorrespondingTest) {
      booking.testHistory = [correspondingTestType];
    }
  }

  private handleError(e: Error): void {
    if (e instanceof InternalAccessDeniedError) {
      // Egress access error, rethrow to abort run
      this.logger.critical('Encountered an InternalAccessDeniedError, aborting the run');
      throw e;
    } else if (e instanceof SarasError) {
      // Swallow any SARAS errors, don't interrupt rest of run
      this.logger.warn('Encountered a SARAS error, continuing the run');
    } else if (e instanceof CrmError) {
      // Swallow only sporadic 400/500 errors from CRM
      // Rethrow any other CRM errors to abort the whole run
      if (!(e.status === 400 || e.status === 500)) {
        this.logger.critical('Encountered a critical CRM error, aborting the run');
        throw e;
      }
      this.logger.warn('Encountered a transient CRM error, continuing the run');
    } else {
      // Other unexpected error, rethrow to abort the whole run
      this.logger.critical('Encountered an unexpected error, aborting the run');
      throw e;
    }
  }
}

export {
  Synchroniser,
};
