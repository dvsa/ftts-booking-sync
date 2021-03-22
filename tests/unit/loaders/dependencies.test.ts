import { Container } from 'typedi';

import { dependencies } from '../../../src/loaders/dependencies';

jest.mock('../../../src/services/crm');
jest.mock('../../../src/services/saras');
jest.mock('../../../src/services/saras/axios-instance');

describe('Dependency Injector Loader', () => {
  const mockContext = {};

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Utilities are loaded into container', async () => {
    // arrange
    const setSpy = jest.spyOn(Container, 'set');

    // act
    await dependencies(mockContext as any);

    // assert
    expect(setSpy).toHaveBeenCalled();
  });
});
