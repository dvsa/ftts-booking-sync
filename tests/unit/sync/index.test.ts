import Container from 'typedi';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';

import functionTrigger from '../../../src/sync';

jest.mock('../../../src/loaders/index');
jest.mock('../../../src/sync/sync');

describe('Booking synchroniser', () => {
  const mockContext = {
    log: jest.fn(),
    req: {},
    res: {},
  };

  Container.set('logger', {
    event: jest.fn(),
    log: jest.fn(),
  });

  test('index function is triggered', async () => {
    await functionTrigger(mockContext as any);

    expect(nonHttpTriggerContextWrapper).toHaveBeenCalledWith(expect.any(Function), mockContext);
  });
});
