import { Container } from 'typedi';

import { dependencies } from '../../../src/loaders/dependencies';
import { envLoader } from '../../../src/loaders/env';
import { loader } from '../../../src/loaders/index';

jest.mock('../../../src/loaders/dependencies');
jest.mock('../../../src/loaders/env');

describe('Loaders', () => {
  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
  };

  Container.get = jest.fn((library: string) => {
    const stored = {
      logger: mockLogger,
    };
    return stored[library] as unknown;
  }) as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Ensure env is loaded', async () => {
    await loader();

    expect(envLoader).toHaveBeenCalled();
  });

  test('Ensure dependency injector is loaded', async () => {
    await loader();

    expect(dependencies).toHaveBeenCalled();
  });
});
