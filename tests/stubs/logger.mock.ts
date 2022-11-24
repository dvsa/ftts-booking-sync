import { logger } from '../../src/libraries/logger';

export const mockedLogger = jest.mocked(logger, true);
