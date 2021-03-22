import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { rethrowIfEgressFilteringError, withEgressFiltering } from '../../../src/libraries/egress-filter';
import { logger } from '../../../src/libraries/logger';

jest.mock('../../../src/libraries/logger');

describe('Egress filter', () => {
  describe('withEgressFiltering wrapper', () => {
    const mockAzureFunction = jest.fn();

    test('catches, logs and rethrows InternalAccessDeniedError', async () => {
      const mockContext: any = {};
      const error = new InternalAccessDeniedError('host.co.uk', '443', 'Unrecognised address');
      mockAzureFunction.mockRejectedValueOnce(error);

      await expect(withEgressFiltering(mockAzureFunction)(mockContext)).rejects.toThrow(error);
      expect(logger.logInternalAccessDeniedEvent).toHaveBeenCalledWith(error);
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
