import dotenv from 'dotenv';
import { Container } from 'typedi';
import { envLoader } from '../../../src/loaders/env';

jest.mock('dotenv');
const mockDotenv = dotenv as jest.Mocked<typeof dotenv>;

describe('Environment Loader', () => {
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
    process.env.NODE_ENV = 'test';
  });

  test('Ensure an error is thrown if .env file is not present in development', () => {
    process.env.NODE_ENV = 'development';
    mockDotenv.config.mockImplementationOnce(() => ({
      error: new Error(),
    }));

    expect(envLoader).toThrowError('Could not find .env file');
  });

  test('Ensure node env is set to deployment if non exists', () => {
    mockDotenv.config.mockImplementationOnce(() => ({}));
    delete process.env.NODE_ENV;

    envLoader();

    expect(process.env.NODE_ENV).toStrictEqual('development');
  });

  test('Ensure node env is set to production', () => {
    process.env.NODE_ENV = 'production';
    mockDotenv.config.mockImplementationOnce(() => ({}));

    envLoader();

    expect(process.env.NODE_ENV).toStrictEqual('production');
  });
});
