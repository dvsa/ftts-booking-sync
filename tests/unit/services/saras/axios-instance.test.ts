/* eslint-disable no-underscore-dangle */
import { SarasAxios } from '../../../../src/services/saras/axios-instance';
import { MockSarasAxios, MockErrorResponse } from '../../../interfaces';

jest.mock('@azure/identity');
jest.mock('@dvsa/ftts-auth-client');

jest.mock('../../../../src/config', () => ({
  config: {
    saras: {
      maxRetries: 10,
      identity: {},
    },
  },
}));

describe('Saras axios instance', () => {
  let axiosInstance: MockSarasAxios;
  const mockLogger = {
    warn: jest.fn(),
    critical: jest.fn(),
  };

  beforeEach(() => {
    axiosInstance = new SarasAxios('mock-token-value', mockLogger as any) as unknown as MockSarasAxios;
    axiosInstance.instance.request = jest.fn();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pre-request interceptor', () => {
    test('injects auth token headers into request', async () => {
      const mockRequest = { headers: {} };

      const req = await axiosInstance.instance.interceptors.request.handlers[0].fulfilled(mockRequest);

      expect(req).toHaveProperty('headers.Authorization', 'Bearer mock-token-value');
    });
  });

  describe('post-request interceptor', () => {
    describe('given a successful response', () => {
      test('returns the response', async () => {
        const mockResponse = { data: { foo: 'bar' } };

        const res = await axiosInstance.instance.interceptors.response.handlers[0].fulfilled(mockResponse);

        expect(res).toStrictEqual(mockResponse);
      });
    });

    describe('given a 429 error response', () => {
      let mockErrorResponse: MockErrorResponse;

      beforeEach(() => {
        jest
          .useFakeTimers('modern')
          .setSystemTime(new Date('Tue, 1 Sep 2020 16:00:00 GMT')); // Mocks Date.now()
        jest.spyOn(global, 'setTimeout');

        mockErrorResponse = {
          config: {
            method: 'post',
          },
          response: {
            status: 429,
            headers: {
              'retry-after': '30',
            },
          },
        };
      });

      describe('with Retry-After header in seconds', () => {
        test('waits the correct amount and then retries the request', async () => {
          mockErrorResponse.response.headers['retry-after'] = '20.5';

          // Promise is deliberately floating due to issue with jest fake timers
          // https://stackoverflow.com/questions/52177631/jest-timer-and-promise-dont-work-well-settimeout-and-async-function
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          Promise.resolve().then(() => jest.runAllTimers());
          await axiosInstance.instance.interceptors.response.handlers[0].rejected(mockErrorResponse);

          expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 20500);
          expect(axiosInstance.instance.request).toHaveBeenCalledTimes(1);
        });
      });

      describe('with Retry-After header in datetime format', () => {
        test('waits the correct amount and then retries the request', async () => {
          mockErrorResponse.response.headers['retry-after'] = 'Tue, 1 Sep 2020 16:00:25 GMT'; // 25 seconds after mock Date.now()

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          Promise.resolve().then(() => jest.runAllTimers());
          await axiosInstance.instance.interceptors.response.handlers[0].rejected(mockErrorResponse);

          expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 25000);
          expect(axiosInstance.instance.request).toHaveBeenCalledTimes(1);
        });
      });

      describe('with missing/empty Retry-After header', () => {
        test('waits a default 10 seconds and then retries the request', async () => {
          mockErrorResponse.response.headers = {};

          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          Promise.resolve().then(() => jest.runAllTimers());
          await axiosInstance.instance.interceptors.response.handlers[0].rejected(mockErrorResponse);

          expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
          expect(axiosInstance.instance.request).toHaveBeenCalledTimes(1);
        });
      });

      test('sets the retry count on first retry', async () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve().then(() => jest.runAllTimers());
        await axiosInstance.instance.interceptors.response.handlers[0].rejected(mockErrorResponse);

        expect(mockErrorResponse.config).toHaveProperty('_retryCount');
      });

      test('increments the retry count on successive retries', async () => {
        mockErrorResponse.config._retryCount = 2;

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve().then(() => jest.runAllTimers());
        await axiosInstance.instance.interceptors.response.handlers[0].rejected(mockErrorResponse);

        expect(mockErrorResponse.config._retryCount).toBe(3);
      });

      test('gives up and re-throws the error if max retries is exceeded', async () => {
        mockErrorResponse.config._retryCount = 10;

        await expect(
          axiosInstance.instance.interceptors.response.handlers[0].rejected(mockErrorResponse),
        ).rejects.toEqual(mockErrorResponse);
      });
    });

    describe('given some other error response', () => {
      test('rethrows the error', async () => {
        const mockErrorResponse = {
          config: {
            method: 'post',
          },
          response: {
            status: 500,
            headers: { },
          },
        };

        await expect(
          axiosInstance.instance.interceptors.response.handlers[0].rejected(mockErrorResponse),
        ).rejects.toEqual(mockErrorResponse);
      });
    });

    describe('given any other unexpected error', () => {
      test('rethrows the error', async () => {
        const mockError = new Error('Unexpected');

        await expect(
          axiosInstance.instance.interceptors.response.handlers[0].rejected(mockError),
        ).rejects.toEqual(mockError);
      });
    });
  });
});
