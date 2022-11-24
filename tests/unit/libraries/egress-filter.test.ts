import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { rethrowIfEgressFilteringError, onInternalAccessDeniedError } from '../../../src/libraries/egress-filter';
import { logger } from '../../../src/libraries/logger';

jest.mock('../../../src/libraries/logger');

describe('Egress filter', () => {
  describe('onInternalAccessDeniedError callback', () => {
    test('logs and rethrows InternalAccessDeniedError', () => {
      const mockError = new InternalAccessDeniedError('host.co.uk', '443', 'Unrecognised address');

      expect(() => onInternalAccessDeniedError(mockError)).toThrow(mockError);
      expect(logger.security).toHaveBeenCalled();
      expect(logger.logInternalAccessDeniedEvent).toHaveBeenCalledWith(mockError);
    });
  });

  describe('rethrowIfEgressFilteringError helper', () => {
    test('rethrows the given error if it\'s an InternalAccessDeniedError', () => {
      const error = new InternalAccessDeniedError('host.co.uk', '443', 'Unrecognised address');

      expect(() => rethrowIfEgressFilteringError(error)).toThrow(error);
    });

    test('otherwise doesn\'t rethrow', () => {
      const error = new Error('some other error');

      expect(() => rethrowIfEgressFilteringError(error)).not.toThrow();
    });
  });
});
