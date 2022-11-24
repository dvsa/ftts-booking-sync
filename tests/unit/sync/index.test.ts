import { Context } from '@azure/functions';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';

import { index as funcTrigger } from '../../../src/sync';

jest.mock('../../../src/loaders/index');
jest.mock('../../../src/sync/sync');
jest.mock('@dvsa/ftts-auth-client');

describe('Booking synchroniser', () => {
  const mockContext = {
    req: {},
    res: {},
  };

  test('index function is triggered', async () => {
    await funcTrigger(mockContext as any as Context);

    expect(nonHttpTriggerContextWrapper).toHaveBeenCalledWith(expect.any(Function), mockContext);
  });
});
