import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { Logger, BusinessTelemetry } from '../../../src/libraries/logger';

describe('Logger extension', () => {
  const logger = new Logger();

  describe('logSarasEvent', () => {
    test('given a SARAS response status, logs the corresponding event', () => {
      logger.logSarasEvent(400);

      expect(logger.event).toHaveBeenCalledWith(BusinessTelemetry.CBS_TE_BAD_REQUEST, undefined, undefined);
    });

    test('logs no event if the given status is not found', () => {
      logger.logSarasEvent(501);

      expect(logger.event).not.toHaveBeenCalledWith();
    });

    test('logs no event if the given status is undefined', () => {
      logger.logSarasEvent(undefined);

      expect(logger.event).not.toHaveBeenCalledWith();
    });
  });

  describe('logCrmEvent', () => {
    test('given a CRM response status, logs the corresponding event', () => {
      logger.logCrmEvent(500);

      expect(logger.event).toHaveBeenCalledWith(BusinessTelemetry.CBS_CDS_INTERNAL_ERROR, undefined, undefined);
    });

    test('logs no event if the given status is not found', () => {
      logger.logCrmEvent(329);

      expect(logger.event).not.toHaveBeenCalledWith();
    });

    test('logs no event if the given status is undefined', () => {
      logger.logCrmEvent(undefined);

      expect(logger.event).not.toHaveBeenCalledWith();
    });
  });

  describe('logInternalAccessDeniedEvent', () => {
    test('logs an event for the given InternalAccessDeniedError', () => {
      const error = new InternalAccessDeniedError('host.co.uk', '443', 'Unrecognised address');

      logger.logInternalAccessDeniedEvent(error);

      expect(logger.event).toHaveBeenCalledWith(BusinessTelemetry.NOT_WHITELISTED_URL_CALL, error.message, {
        host: 'host.co.uk',
        port: '443',
      });
    });
  });
});
