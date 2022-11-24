import { Container } from 'typedi';

import { dependencies } from '../../../src/loaders/dependencies';

jest.mock('../../../src/services/crm');
jest.mock('../../../src/services/saras');
jest.mock('../../../src/services/saras/axios-instance');
jest.mock('@dvsa/ftts-auth-client');

describe('Dependency Injector Loader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Utilities are loaded into container', async () => {
    const setSpy = jest.spyOn(Container, 'set');

    await dependencies();

    expect(setSpy).toHaveBeenCalled();
  });
});
