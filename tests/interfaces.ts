export interface MockSarasAxios {
  instance: {
    request: (req) => MockRequest
    interceptors: {
      request: {
        handlers: [{
          fulfilled: (req) => Promise<MockRequest>
        }]
      },
      response: {
        handlers: [{
          fulfilled: (res) => Promise<MockResponse>
          rejected: (res) => Promise<MockErrorResponse>
        }]
      }
    }
  },
}

export interface MockRequest {
  headers: Record<string, string>;
}

export interface MockResponse {
  data: Record<string, unknown>;
}

export interface MockErrorResponse {
  config: {
    method: string;
    _retryCount?: number;
  },
  response: {
    status: number;
    headers: Record<string, string>;
  },
}
